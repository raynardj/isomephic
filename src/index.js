import {
    forceProperties, updateForces, simulation,
    height, width,
    dragstarted, dragended, dragged,
    initializeForces, initializeSimulation
} from "./force.js"

import {pretty_json} from "../easy_bs.js"

console.log(`SVG height ${height}, width ${width}`)

var json_options = {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
    }
}

var byId = elementId => document.getElementById(elementId)
var idVal = elementId => byId(elementId).value

var active_node_style = "fill:rgba(255,200,80,0.6);stroke:rgba(200,120,80,0.6);stroke-width:5"
var deactive_node_style = "fill:rgba(130,190,180,0.6);stroke:rgba(70,120,230,0.6);stroke-width:3"

var set_config = (config) => {
    window.iso_config = config
}

chrome.storage.sync.get(set_config)

var transaction = (data, callback = console.log,
    error_handler = console.error) => {
    /*
    Cypher transaction
    data in format of
    {
        statemetns:[
            {
                statement:'cypher query',
                parameters:{}
            }
        ]
    }
    */
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



var updateDisplay = (data) => {
    data.d3nodes
        .attr("r", forceProperties.collide.radius)

    // data.d3lines
    //     .attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
    //     .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

var visualize_node = (node) => {
    return node.row[0].name
}

var node_active = (e, d) => {
    var idx=d.row[0].idx
    $(".node_box").each(function (){
        this.style = deactive_node_style
    })
    byId(`node_box_${idx}`).style = active_node_style

    $(`#node_tag_${idx}`).collapse('show')
}

var d3_paint_tags = (data) =>{
    var tags = d3.select("#all_tags")
        
    var node_tags = tags
    .selectAll(".node_tag")
    .data(data.nodes).enter()
    .append("div")
    .attr("class","node_tag card single_tag")

    var node_tags_head = node_tags
    .append("div")
    .attr("class","card-header")
    .attr("id", (d)=>{return `node_head_${d.row[0].idx}`})

    node_tags_head.append("h6")
    .append("div")
    // .attr("class","btn btn-block text-left")
    .attr("data-toggle","collapse")
    .attr("data-target",(d)=>{return `#node_tag_${d.row[0].idx}`})
    .attr("aria-expanded","true")
    .attr("aria-controls",(d)=>{return `node_tag_${d.row[0].idx}`})
    .text((d)=>{return d.row[0].name})
    .on("click", node_active)

    var node_tags_body = node_tags.append("div")
    .attr("id",(d)=>{return `node_tag_${d.row[0].idx}`})
    .attr("class","collapse p-2 tag_body")
    .attr("aria-labelledby",(d)=>{return `node_head_${d.row[0].idx}`})
    .attr("data-parent","#all_tags")
    .append((d)=>{return pretty_json(d.row[0])})


    /* line tags*/
    var line_tags = tags
    .selectAll(".line_tag")
    .data(data.links).enter()
    .append("div")
    .attr("class","line_tag card single_tag")

    var line_tags_head = line_tags
    .append("div")
    .attr("class","card-header")
    .attr("id", (d)=>{return `line_head_${d[1].idx}`})

    line_tags_head.append("h6")
    .append("div")
    // .attr("class","btn btn-block text-left")
    .attr("data-toggle","collapse")
    .attr("data-target",(d)=>{return `#line_tag_${d[1].idx}`})
    .attr("aria-expanded","true")
    .attr("aria-controls",(d)=>{return `line_tag_${d[1].idx}`})
    .text((d)=>{return `(${d.source.row[0].name})-${d[1].name}->(${d.target.row[0].name})`})
    // .on("click", node_active)

    var line_tags_body = line_tags.append("div")
    .attr("id",(d)=>{return `line_tag_${d[1].idx}`})
    .attr("class","collapse p-2 tag_body")
    .attr("aria-labelledby",(d)=>{return `line_head_${d[1].idx}`})
    .attr("data-parent","#all_tags")
    .append((d)=>{return pretty_json(d[1])})
}

var d3_paint_nodes = (nodes) =>{
    var u = d3.select("svg")
        .selectAll(".node")
        .data(nodes)

    var node = u.enter().append("g")
        .attr("class", "node")
        .merge(u)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    var boxes = node.append("rect")
    .attr("id",(d)=>{return `node_box_${d.row[0].idx}`})
    .attr("class","node_box")
        .attr("width", "120")
        .attr("height", "60")
        .attr("rx", "20").attr("ry", "20")
        .attr("alignment-baseline", "middle")
        .attr("style",deactive_node_style)
        .on("click", node_active);

    var texts = node.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("alignment-baseline", "middle")
        .text(visualize_node)
        .on("click", node_active);;
    
    return {node, boxes, texts}
}

var visualize_link = (d)=>{
    return d[1].name
}

var d3_paint_links = (links) =>{
    var u = d3.select("svg")
        .selectAll(".link")
        .data(links)
    
    var link = u.enter().append("line")
        .attr("className", "link")
        .attr("style","stroke:rgba(0,0,0,0.5);stroke-width:3;opacity:1")
        .merge(u);

    // var line = link.append("line")
        
    var link_text = link.append("text")
    .text(visualize_link)

    return {link, link_text}
}

var d3_paint_graph = (data) => {
    var nodes = data.nodes;

    var links = data.links;

    var {node, boxes, texts} = d3_paint_nodes(nodes)

    var {link, link_text} = d3_paint_links(links)

    data.d3nodes = node;
    data.d3boxes = boxes;
    data.d3texts = texts;
    data.d3links = link;
    data.d3link_text = link_text;

    initializeSimulation(simulation, data)

    updateDisplay(data)
}

var gather_nodes = (res) => {
    var { errors, results } = res
    if (errors.length > 0) {
        for (var i in errors) { console.error(errors[i]) }
        return
    }
    var data = {}
    window.graph_data = data
    data.nodes = results[0]['data'];

    data.nodes_by_idx = {};
    for(var i in data.nodes){
        var node = data.nodes[i]
        data.nodes_by_idx[node.row[0].idx] = node
    }
    console.log(data)
    get_links(data)()
}
var gather_links = (data)=>{
    var gather_links_ = (res,) =>{
        /*
        Collect link data from API response
        */
        var { errors, results } = res
        if (errors.length > 0) {
            for (var i in errors) { console.error(errors[i]) }
            return
        }
        var links = []
        for(var i in results[0].data){
            var result = results[0].data[i].row
            result.source = data.nodes_by_idx[result[0]]
            result.target = data.nodes_by_idx[result[2]]
            links.push(result)
        }
        data.links = links
        d3_paint_graph(data)
        d3_paint_tags(data)
    }
    return gather_links_
}
var get_links=(data)=>{
    var get_links_ = () =>{
        var nodes = data.nodes;
        var ids = []
        for(var i in nodes){ids.push(nodes[i]['meta'][0]['id'])}

        transaction({
            statements:[
                {
                    statement:`
                    MATCH (a) WHERE id(a) IN [${ids.join(",")}]
                    MATCH (a)-[r]-(b) WHERE id(b) IN [${ids.join(",")}]
                    RETURN a.idx, r, b.idx
                    `,
                    parameters:{}
                }
            ]
        },
        gather_links(data),
        console.error
        )
    }
    return get_links_
}
var search_name = (text, callback, error_handler) => {
    var search_query = `'${text.split(",").join(`','`)}'`
    transaction({
        statements: [
            {
                statement: `
                MATCH (n: Item)
                WHERE n.${window.iso_config.name_kw}
                    IN [${search_query}]
                RETURN n LIMIT 20`,
                parameters: {},
            },
        ]
    }, callback, error_handler)
}

var process_input = () => {
    search_name(
        idVal("search"), gather_nodes, console.error)
}

byId("search_btn").addEventListener("click", process_input)