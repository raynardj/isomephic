import {
    forceProperties, updateForces, simulation,
    height, width,
    dragstarted, dragended, dragged,
    initializeForces, initializeSimulation
} from "./force.js"

console.log(`SVG height ${height}, width ${width}`)

var json_options = {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
    }
}

var byId = elementId => document.getElementById(elementId)
var idVal = elementId => byId(elementId).value

var set_config = (config) => {
    window.iso_config = config
}

chrome.storage.sync.get(set_config)

var transaction = (data, callback = console.log,
    error_handler = console.error) => {
    console.info(`tx data ${JSON.stringify(data,null,2)}`)
    var config = window.iso_config
    var { url, name_kw, id_kw } = config;
    fetch(url, {
        ...json_options,
        body: JSON.stringify(data)
    }).then(res => res.json())
        .then(callback)
        .catch(error_handler)
}

var visualize_node = (node) => {
    return node.row[0].name
}

var updateDisplay = (node, link) => {
    node
        .attr("r", forceProperties.collide.radius)

    // link
    //     .attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
    //     .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

var updateAll = () => {
    updateDisplay(window.d3nodes, window.d3links);
    updateForces(simulation)
}
var visualize_nodes = () => {
    var nodes = window.nodes;

    var links = window.links;

    var u = d3.select("svg")
        .selectAll(".node")
        .data(nodes)

    initializeSimulation(simulation, nodes)

    var node = u.enter().append("g")
        .attr("className", "node")
        .merge(u)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    var boxes = node.append("rect")
        .attr("width", "200")
        .attr("height", "100")
        .attr("rx", "20").attr("ry", "20")
        .attr("alignment-baseline", "middle")
        .attr("style",
        "fill:rgba(255,255,255,0.6);stroke:black;strock-width:10");

    var texts = node.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("alignment-baseline", "middle")
        .text(visualize_node);

    window.d3nodes = node;
    window.d3boxes = boxes;
    window.d3texts = texts;
    updateDisplay(node, {})
}

var visualize_result = (res) => {
    var { errors, results } = res
    if (errors.length > 0) {
        for (var i in errors) { console.error(errors[i]) }
        return
    }
    window.nodes = results[0]['data'];
    console.log(window.nodes)
    get_links()
}

var deploy_links = (res) =>{
    console.log(res)
    var { errors, results } = res
    if (errors.length > 0) {
        for (var i in errors) { console.error(errors[i]) }
        return
    }
    var links = []
    for(var i in results[0].data){
        var result = results[0].data[i]
        links.push(result.row)
    }
    window.links = links
    visualize_nodes()
}

var get_links = () =>{
    var nodes = window.nodes;
    var ids = []
    for(var i in nodes){ids.push(nodes[i]['meta'][0]['id'])}

    transaction({
        statements:[
            {
                statement:`
                MATCH (a) WHERE id(a) IN [${ids.join(",")}]
                MATCH (a)-[r]-(b) WHERE id(b) IN [${ids.join(",")}]
                RETURN a.idx, r.idx, b.idx
                `,
                parameters:{}
            }
        ]
    },
    deploy_links,
    console.error
    )
}

var process_input = () => {
    search_name(idVal("search"), visualize_result, console.error)
}

var search_name = (text, callback, error_handler) => {
    var search_query = `'${text.split(",").join(`','`)}'`
    transaction({
        statements: [
            {
                statement: `
                MATCH (n: Item)
                WHERE n.${window.iso_config.name_kw} IN [${search_query}]
                RETURN n LIMIT 20`,
                parameters: {},
            },
        ]
    }, callback, error_handler)
}

byId("search_btn").addEventListener("click", process_input)