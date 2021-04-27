import {
    get_idx, shorten, get_link_triplets,
    transaction, style_config, byId
} from "./utils.js"

import {
    forceProperties,
    dragstarted, dragended, dragged, simulation,
    initializeSimulation
} from "./force.js"

import { pretty_json } from "../easy_bs.js"

const visualize_node = (node) => {
    return shorten(node.row[0].name)
}

const visualize_link = (d) => {
    return d[1].name
}

/* Event Functions */

var deactivate_all = () => {
    /*
    Switch all nodes/ edges into deactivated status
    */
    $(".node_box").each(function () {
        this.style = style_config.node.deactive
    })
    $(".link").each(function () {
        this.style = style_config.line.deactive
    })
}

var node_active = (e, d) => {
    var idx = d.row[0].idx
    deactivate_all()
    byId(`node_box_${idx}`).style = style_config.node.active
    $(`#node_tag_${idx}`).collapse('show')
}

var link_active = (e, d) => {
    var triplet = get_link_triplets(d);
    deactivate_all()
    byId(`link_${triplet}`).style = style_config.line.active

    $(`#line_tag_${triplet}`).collapse('show')
}

var find_upward = (idx) => {
    var node_indices = []
    var d3links = []
    console.log(`finding: .link_end_${idx}`)

    $(`.link_end_${idx}`).each(function(){
        node_indices.push($(this).data('start'));
        d3links.push(this)
    })
    return {node_indices, d3links}
}

var find_downward = (idx) => {
    var node_indices = []
    var d3links = []

    $(`.link_start_${idx}`).each(function(){
        node_indices.push($(this).data('end'));
        d3links.push(this)
    })
    return {node_indices, d3links}
}

var remove_side = (data, side)=>{
    var finder = {
        upward:find_upward,
        downward:find_downward
    }[side]
    var remove_side_ = idx =>{
        console.log(`Removing related nodes to ${idx}`)
        var {node_indices, d3links} = finder(idx)
        discard_links()
        for (var i in node_indices){
            var fi = node_indices[i];
            remove_single_node(data, fi)
        }
        get_links(data)()
    }
    return remove_side_
}

var remove_single_node = (data, idx) =>{
    var node = data.nodes_by_idx[idx];
    var id_ = node.meta[0].id;

    delete data.nodes_by_identifier[id_]
    delete data.id_to_idx[id_]
    delete data.nodes_by_idx[idx]
    delete data.idx_to_id[idx]
    for(var i in data.nodes){
        if(get_idx(data.nodes[i])==idx){delete data.nodes[i]}
    }
    $(`#node_g_${idx}`).remove()
    $(`#node_tag_frame_${idx}`).remove()
    
}

var get_links = (data) => {
    var get_links_ = () => {
        discard_links();
        var ids = []
        for (var i in data.nodes_by_identifier) { ids.push(i) }

        transaction({
            statements: [
                {
                    statement: `
                    MATCH (a)-[r]->(b) WHERE id(a) IN [${ids.join(",")}]
                    AND id(b) IN [${ids.join(",")}]
                    RETURN DISTINCT a.idx, r, b.idx
                    `,
                    parameters: {}
                }
            ]
        },
            gather_links(data, d3_paint),
            console.error
        )
    }
    return get_links_
}

var add_nodes = (data, new_nodes) => {
    console.log(`new nodes`);
    console.log(new_nodes);
    for (var i in new_nodes) {
        var node = new_nodes[i];
        if (!data.nodes_by_idx[get_idx(node)]) {
            data.nodes.push(node)
            data.nodes_by_idx[node.row[0].idx] = node
            data.nodes_by_identifier[node.meta[0].id] = node
            data.id_to_idx[node.meta[0].id] = get_idx(node)
            data.idx_to_id[get_idx(node)] = node.meta[0].id
        }
    }
    return data
}

var get_empety_data = () => {
    return { nodes: [], nodes_by_idx: {}, nodes_by_identifier: {}, id_to_idx: {}, idx_to_id: {} }
}

var gather_nodes = (res) => {
    var { errors, results } = res
    if (errors.length > 0) {
        for (var i in errors) { console.error(errors[i]) }
        return
    }
    var data = get_empety_data()
    window.graph_data = data

    data = add_nodes(data, results[0]['data']);

    get_links(data)()
}
var more_nodes = (data) => {
    var more_nodes_ = (res) => {
        /* 
        Add more nodes
        */
        var { errors, results } = res
        if (errors.length > 0) {
            for (var i in errors) { console.error(errors[i]) }
            return
        }

        data = add_nodes(data, results[0]['data']);

        get_links(data)()
    }
    return more_nodes_
}
var gather_links = (data, callback) => {
    var gather_links_ = (res,) => {
        /*
        Collect link data from API response
        */
        var { errors, results } = res

        if (errors.length > 0) {
            for (var i in errors) { console.error(errors[i]) }
            return
        }
        var links = []
        for (var i in results[0].data) {
            var result = results[0].data[i].row
            result.source = data.nodes_by_idx[result[0]]
            result.target = data.nodes_by_idx[result[2]]
            links.push(result)
        }
        data.links = links
        callback(data)
    }
    return gather_links_
}

var expand_node_upward = (data, idx) => {
    var id_ = data.idx_to_id[idx];

    transaction({
        statements: [{
            statement: `
            MATCH (a: Item)-[r]->(b: Item)
            WHERE id(b)=${id_}
            RETURN a LIMIT 30
            `,
            parameters: {},
        }]
    },
        more_nodes(data), console.error
    )
}

var expand_node_downward = (data, idx) => {
    var id_ = data.idx_to_id[idx]
    transaction({
        statements: [{
            statement: `
            MATCH (a: Item)-[r]->(b: Item)
            WHERE id(a)=${id_}
            RETURN b LIMIT 30
            `,
            parameters: {},
        }]
    },
        more_nodes(data), console.error
    )
}

var click_to_expand = (schema, data) => {
    /*
    schema: "upward", "downward"
    */
    var expander = {
        upward: expand_node_upward,
        downward: expand_node_downward
    }[schema]

    var click_to_expand_ = (e, d) => {
        expander(data, get_idx(d))
    }
    return click_to_expand_
}

/* paint functions */

var d3_paint_tags_nodes = (data) => {
    var { tags } = data

    var node_tags = tags
        .selectAll(".node_tag")
        .data(data.nodes).enter()
        .append("div")
        .attr("id", d => `node_tag_frame_${get_idx(d)}`)
        .attr("class", "node_tag card single_tag")

    var node_tags_head = node_tags
        .append("div")
        .attr("class", "card-header")
        .attr("id", d => `node_head_${get_idx(d)}`)

    node_tags_head.append("h6")
        .append("div")
        .attr("data-toggle", "collapse")
        .attr("data-target", d => `#node_tag_${get_idx(d)}`)
        .attr("aria-expanded", "true")
        .attr("aria-controls", d => `node_tag_${get_idx(d)}`)
        .text(d => shorten(d.row[0].name))
        .on("click", node_active)

    var node_tags_body = node_tags.append("div")
        .attr("id", (d) => { return `node_tag_${d.row[0].idx}` })
        .attr("class", "collapse p-2 tag_body")
        .attr("aria-labelledby", (d) => { return `node_head_${d.row[0].idx}` })
        .attr("data-parent", "#all_tags")

    var node_tag_btns = node_tags_body.append("div")
        .attr("class", "btn-group m-2")

    var node_tag_btns_up = node_tag_btns.append("div")
        .attr("class", "node_traverse_upward btn btn-success btn-sm")
        .on("click", click_to_expand("upward", data))

    node_tag_btns_up
        .append("i")
        .attr("class", "fa fa-toggle-up")

    var node_tag_btns_clear_up = node_tag_btns.append("div")
        .attr("class", "node_clear_upward btn btn-success btn-sm")
        .on("click", (e, d) => remove_side(data, "upward")(get_idx(d)))

    node_tag_btns_clear_up
        .append('i')
        .attr('class', 'fa fa-trash')

    var node_tag_btns_down = node_tag_btns.append("div")
        .attr("class", "node_traverse_downward btn btn-warning btn-sm")
        .on("click", click_to_expand("downward", data))

    node_tag_btns_down
        .append("i")
        .attr("class", "fa fa-toggle-down")

    var node_tag_btns_clear_down = node_tag_btns.append("div")
        .attr("class", "node_clear_downward btn btn-warning btn-sm")

    node_tag_btns_clear_down
        .append('i')
        .attr('class', 'fa fa-trash')

    node_tags_body.append((d) => { return pretty_json(d.row[0]) })
}

var d3_paint_tags_links = (data) => {
    var { tags } = data

    /* line tags*/
    var line_tags = tags
        .selectAll(".line_tag")
        .data(data.links).enter()
        .append("div")
        .attr("class", "line_tag card single_tag")

    var line_tags_head = line_tags
        .append("div")
        .attr("class", "card-header")
        .attr("id", (d) => { return `line_head_${get_link_triplets(d)}` })

    line_tags_head.append("h6")
        .append("div")
        // .attr("class","btn btn-block text-left")
        .attr("data-toggle", "collapse")
        .attr("data-target", (d) => { return `#line_tag_${get_link_triplets(d)}` })
        .attr("aria-expanded", "true")
        .attr("aria-controls", (d) => { return `line_tag_${get_link_triplets(d)}` })
        .text((d) => { return `(${shorten(d.source.row[0].name)})-${shorten(d[1].name)}->(${shorten(d.target.row[0].name)})` })
        .on("click", link_active)

    var line_tags_body = line_tags.append("div")
        .attr("id", (d) => { return `line_tag_${get_link_triplets(d)}` })
        .attr("class", "collapse p-2 tag_body")
        .attr("aria-labelledby", (d) => { return `line_head_${get_link_triplets(d)}` })
        .attr("data-parent", "#all_tags")
        .append((d) => { return pretty_json(d[1]) })
}



var d3_paint_tags = (data) => {
    var tags = d3.select("#all_tags")
    data.tags = tags
    d3_paint_tags_nodes(data);
    d3_paint_tags_links(data);
}

var realize_d3_nodes = (d3_node_start) => {
    var d3nodes = d3_node_start.enter().append("g")
    .attr("class", "node")
    .attr("id", d => `node_g_${get_idx(d)}`)
    .attr("r", forceProperties.collide.radius)
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    var d3boxes = d3nodes.append("rect")
        .attr("id", d => `node_box_${get_idx(d)}`)
        .attr("class", "node_box")
        .attr("width", "120")
        .attr("height", "60")
        .attr("rx", "20").attr("ry", "20")
        .attr("alignment-baseline", "middle")
        .attr("style", style_config.node.deactive)
        .on("click", node_active);

    var d3texts = d3nodes.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("alignment-baseline", "middle")
        .text(visualize_node)
        .on("click", node_active);

    return {d3nodes, d3boxes, d3texts,d3_node_start}
}

var d3_paint_nodes = (nodes) => {
    var d3_node_start = d3.select("svg")
        .selectAll(".node")
        .data(nodes)
    return realize_d3_nodes(d3_node_start)
}


var d3_paint_links = (links) => {
    var u = d3.select("svg")
        .selectAll(".link")
        .data(links)

    var d3links = u.enter().append("line")
        .attr("id", d => `link_${get_link_triplets(d)}`)
        .attr("class", d => `link link_start_${d[0]} link_end_${d[2]}`)
        .attr("data-start", d=>d[0])
        .attr("data-end", d=>d[0])
        .attr("style", style_config.line.deactive)
        .merge(u).on("click", link_active);

    // var line = link.append("line")

    var d3link_text = d3links.append("text")
        .text(visualize_link)

    return { d3links, d3link_text }
}

var d3_paint_graph = (data) => {
    // var nodes = data.nodes;

    // var links = data.links;
    data = { ...data, ...d3_paint_nodes(data.nodes) }
    data = { ...data, ...d3_paint_links(data.links) }
    return data
}

var d3_paint = (data) => {
    discard_all()
    data = d3_paint_graph(data)
    window.graph_data = data
    initializeSimulation(simulation, data)
    d3_paint_tags(data)
}

var discard_all = () => {
    discard_nodes()
    discard_links()
}

var discard_nodes = () => {
    /*clear all nodes*/
    $(".node").remove()
    $(".node_tag").remove()
}

var discard_links = () => {
    /*clear all links*/
    $(".link").remove()
    $(".line_tag").remove()
}

export {
    gather_nodes
}