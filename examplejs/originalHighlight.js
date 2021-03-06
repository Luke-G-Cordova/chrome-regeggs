


// http://blog.alexanderdickson.com/javascript-replacing-text
function clearHighlight(keys){
    var elems;
    var nodes;
    var elements;
    var keysCopy = [].concat(keys);
    
    for(let j = 0;j<keysCopy.length;j++){
        elems = document.querySelectorAll(`span.chrome-regeggz-span.highlight-me.${keysCopy[j]}`);
        elements = [].slice.call(elems);
        for(let i = 0;i<elements.length;i++){
            nodes = [].slice.call(elements[i].childNodes);
            var nodesFragment = document.createDocumentFragment();
            for(node in nodes){
                nodesFragment.appendChild(nodes[node]);
            }
            elements[i].parentNode.replaceChild(nodesFragment, elements[i]);
            elements[i] = nodes[0];
            nodes[0].parentNode.normalize();
        }
    }
}


// this is the main algorithm that highlights matches in the html
// returns the number of matches found with in the root
function highlight(root, regex, callback, excludes){
    excludes || (excludes = ['script', 'style', 'iframe', 'canvas']);

    // set a custom treewalker to get the desired text nodes in the html
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, function(node) {
        // only accept nodes that are not empty and whose parents do not match one of the excludes
        if(
            node.data.trim() === '' || 
            excludes.indexOf(node.parentNode.tagName.toLowerCase()) > -1
        ){
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
    });

    // the trimBadHtmlNodes function trims nodes that have white space in front or behind them
    // in the document an inline element does not show white space in front or behind
    // but the node.data still physically has it, this function erases the white space,
    // so the node.data will be more accurat according to its presentation on the page
    function trimBadHtmlNodes(node){
        if(node.data.indexOf('\n') !== -1){
            var block = node.nextSibling;
            var before = after = '';
            if(!block || block.nodeType === Node.ELEMENT_NODE && window.getComputedStyle(block, null).display !== 'block'){
                after = (node.data[node.data.length - 1] === ' ' || node.data[node.data.length - 1] === '\n') ? ' ' : '';
                before = (node.data[0] === ' ' || node.data[0] === '\n') ? ' ' : '';
                node.data = before + node.data.trim() + after;
            }else if(block && block.nodeType === Node.ELEMENT_NODE && window.getComputedStyle(block, null).display === 'block'){
                before = (node.data[0] === ' ' || node.data[0] === '\n') ? ' ' : '';
                node.data = before + node.data.trimStart();
            }
        }
    }
    
    // the relativeNodes function finds out if node1 is a 
    // grandchild of node2's parent, or vise versa. It finds out
    // if one of the nodes is a sibling, or a nephew/niece node.
    // It returns the parent if true, and null if not.
    function relativeNodes(node1, node2){
        var parNode1 = node1, parNode2 = node2;
        var atRoot = false;
        while(true){
            atRoot = parNode1 === root && parNode2 === root;
            if(atRoot) return null;
            if(parNode1.parentNode === node2.parentNode) return node2.parentNode;
            if(parNode2.parentNode === node1.parentNode) return node1.parentNode;
            if(parNode1 !== root){
                parNode1 = parNode1.parentNode;
                if(window.getComputedStyle(parNode1, '').display === 'block'){
                    parNode1 = root;
                }
            }
            if(parNode2 !== root){
                parNode2 = parNode2.parentNode;
                if(window.getComputedStyle(parNode2, '').display === 'block'){
                    parNode2 = root;
                }
            }
        }
    }

    // this block of code creates 2 arrays, nodes, which is used
    // more for debugging than anything in the actual algorithm, 
    // and groupedNodes, which is a multidimensional that groupes
    // elements by common parent. Every array element within 
    // groupedNodes stores the child nodes of the closest parent.
    // Because html is sequential, and the treewalker presents nodes
    // in order from top to bottom, this takes the fist node, and groups
    // all of its siblings/nephew nodes into a single array and then
    // creates a new array and does the same thing again. 
    // Grouping the text nodes like this will insure that all text nodes 
    // in a paragraph are grouped together.
    var nodes = [];
    var groupedNodes = [];
    var lastElem;
    while(tw.nextNode()){
        trimBadHtmlNodes(tw.currentNode);
        if(groupedNodes.length === 0){
            groupedNodes.push([]);
            groupedNodes[groupedNodes.length - 1].push(tw.currentNode);
        }else{
            lastElem = nodes[nodes.length -1];
            if(relativeNodes(tw.currentNode, lastElem)){
                groupedNodes[groupedNodes.length - 1].push(tw.currentNode);
            }else{
                groupedNodes[groupedNodes.length] = [];
                groupedNodes[groupedNodes.length - 1].push(tw.currentNode);
            }
        }
        nodes.push(tw.currentNode);
    }


    // this for loop is the main algorithm for searching for matches.
    var masterStr = '';
    var test;
    var test2;
    var tag;
    var newNode;
    var count = 0;
    var nodeList = [];
    for(i = 0;i<groupedNodes.length;i++){

        // masterStr is a string that contains the content of each
        // group of nodes or paragraph.
        masterStr = groupedNodes[i].map(elem => elem.data).join('');
        
        // loop while there is another match against the provided regex
        // in masterStr. 
        // Ex:
        //      regex = 'the'
        //      masterStr = 'the the the super the hi the'
        //   this will loop 5 for those inputs
        // -----------------------------TODO: I need to make this a looot faster--------------------------
        while(test = regex.exec(masterStr)){
            
            // storing the last found index of the regex so that I can 
            // reuse the regex to test other strings with out breaking
            // the loop
            var lastRegIndex = regex.lastIndex;
            
            // count is the variable that will be returned from this function
            // count keeps track of the amount of matches in the route
            count++;

            // j represents the node index of the paragraph we are on.
            // Ex:
            //      groupedNodes = [ 
            //          ['the', 'house'], 
            //          ['a', 'car']
            //      ]
            // if i = 0 and j = 1 groupedNodes[i][j] = 'house'
            var j = 0;
            
            // nodeParts keeps track of which node we are searching through
            // it is a string that gets each node from a group pushed
            // to the end of it
            var nodeParts = '' + groupedNodes[i][j].data;

            // this loop finds which node contains the first occurence 
            // of the regex, j will represent the first occurence
            while(test.index > nodeParts.length - 1){
                j++;
                nodeParts += groupedNodes[i][j].data;
            }

            // make sure to set regex.lastIndex to 0 to allow searching 
            // globally from the beginning of future searches.
            regex.lastIndex = 0;

            // test2 sees where the regex is in the current node
            test2 = regex.exec(groupedNodes[i][j].data);

            // inThisNode gets the amount of a regex within the first 
            // node. If a match occures accross multiple nodes, inThisNode
            // will get however much of that node is stored in the first one
            // Ex: 
            //      regex = 'the'
            //      oneNode has 'hi t' and the next has 'he bird', we still want 
            //          to be able to highlight the 'the' accross both nodes.
            //      in this case, inThisNode = 't'
            var inThisNode = nodeParts.substring(test.index);

            // in the case of a match accross 2 nodes, test2 will not catch
            // the match because it matching against the full regex not part of it.
            // in this case, test2 is undefined, so this next statement sets test2
            // to a valid test case of the value of inThisNode when undefined.
            test2 || (
                test2 = [], 
                test2[0] = inThisNode, 
                test2['index'] = groupedNodes[i][j].data.length - inThisNode.length, 
                test2['input'] = groupedNodes[i][j].data,
                test2['groups'] = undefined
            );

            // helpArr is a helper array that stores nodes in the order that
            // they come in the sentence.
            var helpArr = [];

            // push the first occurrence of the match to the array
            helpArr.push(test2[0]);

            // this paramater stores the current node with in the match, and is passed
            // to the callback function as the second parameter.
            // Ex. 
            //      regex = 'superhuman'
            //      matched nodes = 'su', 'per', 'hum', 'an'
            //  in the above case, when 'su' gets sent to the callback, sameMatchID = 0,
            //  'per' sameMatchID = 1, 'hum' sameMatchID = 2, and so on if there were more
            //  nodes in this match. For the last node in any match, in this case 'an',
            //  sameMatchID = -1. If there is only one node in the match, sameMatchID = -1.
            var sameMatchID = 0;
            
            // this for loop takes care of the first node that the match occures in, and
            // all subsequent matches, excluding the very last node.
            nodeList.push([]);
            for(k = 0 ; helpArr.join('').length < test[0].length ; k++){
                
                newNode = groupedNodes[i][j].splitText(groupedNodes[i][j].length - helpArr[k].length);
                tag = callback(helpArr[k], sameMatchID);
                newNode.data = '';
                insertedNode = newNode.parentNode.insertBefore(tag, newNode);
                nodeList[nodeList.length - 1].push(insertedNode);
                if(groupedNodes[i][j].data.length === 0){
                    groupedNodes[i][j] = insertedNode.firstChild;
                }else{
                    groupedNodes[i].splice(j + 1, 0, insertedNode.firstChild);
                    j++;
                }
                j++;
                sameMatchID++;
                helpArr.push(groupedNodes[i][j].data);
            }
            // this if statement takes care of the very last node in a match.
            // the else takes care of matches that happen accross a single node.
            var lastNode = helpArr.pop();
            if(helpArr[0]){

                newNode = groupedNodes[i][j].splitText(0);
                tag = callback(lastNode.substr(0, test[0].length - helpArr.join('').length), -1);
                newNode.data = newNode.data.substr(test[0].length - helpArr.join('').length);
                insertedNode = newNode.parentNode.insertBefore(tag, newNode);
                nodeList[nodeList.length - 1].push(insertedNode);
                groupedNodes[i][j] = insertedNode.firstChild;
                if(newNode.data.length > 0){
                    groupedNodes[i].splice(j + 1, 0, newNode);
                }
                sameMatchID++;
            }else{
                newNode = groupedNodes[i][j].splitText(test2.index);
                tag = callback(test2[0], -1);
                newNode.data = newNode.data.substr(test2[0].length);
                insertedNode = newNode.parentNode.insertBefore(tag, newNode);
                nodeList[nodeList.length - 1].push(insertedNode);
                groupedNodes[i].splice(j + 1, 0, insertedNode.firstChild, newNode);
            }

            // reset the nodeParts string
            nodeParts = '';

            // make the regex.lastIndex back to the original last index
            // to prevent braking out of the loop prematurly.
            regex.lastIndex = lastRegIndex;
        }

        // set the regex.lastIndex back to 0 just in case
        regex.lastIndex = 0;
    }
    
    // return the amount of matches in the root
    return {
        count,
        elements: nodeList
    };
}
