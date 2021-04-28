import {
    get_idx, shorten, get_link_triplets,
    transaction, style_config, byId
} from "./utils.js"

import {
    forceProperties,
    dragstarted, dragended, dragged, simulation,
    initializeSimulation,
    updateForces
} from "./force.js"

import { pretty_json } from "../easy_bs.js"

const visualize_node = (node) => {
    return shorten(node.row[0].name)
}

const visualize_link = (d) => {
    return d[1].name
}

/* Event Functions */

var reorder = () =>{
    d3.select("#all_tags")
    .selectAll(".single_tag")
    .sort((a,b) => b.tag_order-a.tag_order)
}

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
    window.graph_data.nodes
    .map(d=>{d.tag_order = 15})
    window.graph_data.links
    .map(d=>{d.tag_order = 10})

    reorder()
}

var node_active = (e, d) => {
    var idx = d.row[0].idx
    deactivate_all()
    byId(`node_box_${idx}`).style = style_config.node.active
    
    d.tag_order+=20
    $(byId(`node_tag_${idx}`)).collapse('show');

    reorder()
}


var node_active2 = (ds) => {
    
    deactivate_all()

    ds.map(d=>{
    var idx = d.row[0].idx
    byId(`node_box_${idx}`).style = style_config.node.active2
    })
}

var link_active = (e, d) => {
    var triplet = get_link_triplets(d);
    deactivate_all()
    byId(`link_${triplet}`).style = style_config.line.active

    $(`#line_tag_${triplet}`).collapse('show')

    node_active2([d.source, d.target])

    d.tag_order+=20
    reorder()
}

var find_upward = (idx) => {
    var node_indices = []
    var d3links = []
    console.log(`finding: .link_end_${idx}`)

    $(`.link_end_${idx}`).each(function () {
        node_indices.push($(this).data('start'));
        d3links.push(this)
    })
    return { node_indices, d3links }
}

var find_downward = (idx) => {
    var node_indices = []
    var d3links = []

    $(`.link_start_${idx}`).each(function () {
        node_indices.push($(this).data('end'));
        d3links.push(this)
    })
    return { node_indices, d3links }
}

var remove_node = idx => {
    remove_single_node(idx);
    get_links(d3_re_paint(updateForces))
}

var remove_side = (side) => {
    var finder = {
        upward: find_upward,
        downward: find_downward
    }[side]
    var remove_side_ = idx => {
        console.log(`Removing related nodes to ${idx}`)
        simulation.stop()
        var { node_indices, d3links } = finder(idx)
        for (var i in node_indices) {
            var fi = node_indices[i];
            remove_single_node(fi)
        }
        get_links(d3_re_paint(updateForces))
    }
    return remove_side_
}

var remove_single_node = (idx) => {
    var node = window.graph_data.nodes_by_idx[idx];
    if (node) {
        node.links = [];
        var id_ = node.meta[0].id;

        delete window.graph_data.nodes_by_identifier[id_]
        delete window.graph_data.id_to_idx[id_]
        delete window.graph_data.nodes_by_idx[idx]
        delete window.graph_data.idx_to_id[idx]

        window.graph_data.nodes = window.graph_data.nodes.filter(x => get_idx(x) != idx)

        $(`#node_g_${idx}`).remove()
        $(`#node_tag_frame_${idx}`).remove()
    }
}

var get_links = (callback) => {
    var data = window.graph_data
    discard_links();
    var ids = []
    for (var i in data.nodes) { ids.push(data.nodes[i].meta[0].id) }

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
        gather_links(callback),
        console.error
    )
}

var add_nodes = (new_nodes) => {
    for (var i in new_nodes) {
        var node = new_nodes[i];
        node.tag_order = 15;
        if (!window.graph_data.nodes_by_idx[get_idx(node)]) {
            node.links = [];
            window.graph_data.nodes.push(node)
            window.graph_data.nodes_by_idx[node.row[0].idx] = node
            window.graph_data.nodes_by_identifier[node.meta[0].id] = node
            window.graph_data.id_to_idx[node.meta[0].id] = get_idx(node)
            window.graph_data.idx_to_id[get_idx(node)] = node.meta[0].id
        }
    }
    return window.graph_data
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

    window.graph_data = get_empety_data()

    add_nodes(results[0]['data']);
    d3_paint_nodes(window.graph_data.nodes);
    var tags = d3.select("#all_tags");
    window.graph_data.tags = tags
    d3_paint_tags_nodes();
    get_links(d3_re_paint(initializeSimulation));
}
var more_nodes = (res) => {
        /* 
        Add more nodes
        */
        var { errors, results } = res
        if (errors.length > 0) {
            for (var i in errors) { console.error(errors[i]) }
            return
        }

        add_nodes(results[0]['data']);
        simulation.stop()

        var d3_node_start = d3.select("svg")
            .selectAll(".node")
            .data(window.graph_data.nodes)

        var { d3nodes } = realize_d3_nodes(d3_node_start.enter())
        window.graph_data.d3nodes._groups = [...window.graph_data.d3nodes._groups, ...d3nodes._groups]
        get_links(d3_re_paint(updateForces))
        d3_paint_tags_nodes()
}
var gather_links = (callback) => {
    var gather_links_ = (res,) => {
        /*
        Collect link data from API response
        */
        var { errors, results } = res

        if (errors.length > 0) {
            for (var i in errors) { console.error(errors[i]) }
            return
        }
        window.graph_data.links = []
        for (var i in results[0].data) {
            var result = results[0].data[i].row
            result.source = window.graph_data.nodes_by_idx[result[0]]
            result.source.links.push(result)
            result.target = window.graph_data.nodes_by_idx[result[2]]
            result.target.links.push(result)
            result.tag_order = 10
            window.graph_data.links.push(result)
        }
        d3_paint_tags_links();
        callback();
    }
    return gather_links_
}

var expand_node_upward = (idx) => {
    var id_ = window.graph_data.idx_to_id[idx];

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
        more_nodes, console.error
    )
}

var expand_node_downward = (idx) => {
    var id_ = window.graph_data.idx_to_id[idx]
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
        more_nodes, console.error
    )
}

var click_to_expand = (schema) => {
    /*
    schema: "upward", "downward"
    */
    var expander = {
        upward: expand_node_upward,
        downward: expand_node_downward
    }[schema]

    var click_to_expand_ = (e, d) => {
        expander(get_idx(d))
    }
    return click_to_expand_
}

/* paint functions */

var realize_d3_tags_nodes = (start) => {
    var node_tag = start
        .append("div")
        .attr("id", d => `node_tag_frame_${get_idx(d)}`)
        .attr("class", "node_tag card single_tag")

    node_tag.merge(start)

    var node_tags_head = node_tag
        .append("div")
        .attr("class", "card-header text-primary")
        .attr("id", d => `node_head_${get_idx(d)}`)

    node_tags_head
        .append("div")
        .attr("data-toggle", "collapse")
        .attr("data-target", d => `#node_tag_${get_idx(d)}`)
        .attr("aria-expanded", "true")
        .attr("aria-controls", d => `node_tag_${get_idx(d)}`)
        .text(d => shorten(d.row[0].name))
        .on("click", node_active)

    var node_tags_body = node_tag.append("div")
        .attr("id", d => `node_tag_${d.row[0].idx}`)
        .attr("class", "collapse p-2 tag_body")
        .attr("aria-labelledby", (d) => { return `node_head_${d.row[0].idx}` })
        .attr("data-parent", "#all_tags")

    var node_tag_btns = node_tags_body.append("div")
        .attr("class", "btn-group m-2")

    var node_tag_btns_up = node_tag_btns.append("div")
        .attr("class", "node_traverse_upward btn btn-success btn-sm")
        .on("click", click_to_expand("upward"))

    node_tag_btns_up
        .append("i")
        .attr("class", "fa fa-toggle-up")

    var node_tag_btns_clear_up = node_tag_btns.append("div")
        .attr("class", "node_clear_upward btn btn-success btn-sm")
        .on("click", (e, d) => remove_side("upward")(get_idx(d)))

    node_tag_btns_clear_up
        .append('i')
        .attr('class', 'fa fa-trash')

    var node_tag_btns_down = node_tag_btns.append("div")
        .attr("class", "node_traverse_downward btn btn-warning btn-sm")
        .on("click", click_to_expand("downward"))

    node_tag_btns_down
        .append("i")
        .attr("class", "fa fa-toggle-down")

    var node_tag_btns_clear_down = node_tag_btns.append("div")
        .attr("class", "node_clear_downward btn btn-warning btn-sm")
        .on("click", (e, d) => remove_side("downward")(get_idx(d)))

    node_tag_btns_clear_down
        .append('i')
        .attr('class', 'fa fa-trash')

    var node_tag_btns_remove_node = node_tag_btns.append("div")
        .attr("class", "node_remove btn btn-danger btn-sm")
        .on("click", (e,d)=> remove_node(get_idx(d)))

    node_tag_btns_remove_node
    .append('i')
        .attr('class', 'fa fa-trash')

    node_tags_body.append((d) => { return pretty_json(d.row[0]) })
}

var d3_paint_tags_nodes = () => {
    var { tags } = window.graph_data

    var node_tags = tags
        .selectAll(".node_tag")
        .data(window.graph_data.nodes)

    realize_d3_tags_nodes(node_tags.enter())
}

var realize_d3_tags_links = (start) => {
    var line_tags  = start
    .append("div")
    .attr("class", "line_tag card single_tag")

    line_tags.merge(start)

    var line_tags_head = line_tags
        .append("div")
        .attr("class", "card-header text-danger")
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

var d3_paint_tags_links = () => {
    var { tags } = window.graph_data
    /* line tags*/
    var line_tags = tags
        .selectAll(".line_tag")
        .data(window.graph_data.links)

    realize_d3_tags_links(line_tags.enter())
}

var realize_d3_nodes = (d3_node_start) => {
    var d3nodes = d3_node_start.append("g")

    d3nodes.merge(d3_node_start).call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    d3nodes
        .attr("class", "node")
        .attr("id", d => `node_g_${get_idx(d)}`)
        .attr("r", forceProperties.collide.radius)

    var d3boxes = d3nodes.append("rect")
        .attr("id", d => `node_box_${get_idx(d)}`)
        .attr("class", "node_box")
        .attr("width", "120")
        .attr("height", "60")
        .attr("rx", "10").attr("ry", "30")
        .attr("alignment-baseline", "middle")
        .attr("style", style_config.node.deactive)
        .on("click", node_active);

    var d3texts = d3nodes.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("alignment-baseline", "middle")
        .text(visualize_node)
        .on("click", node_active);

    return { d3nodes, d3boxes, d3texts, d3_node_start }
}

var d3_paint_nodes = (nodes) => {
    var d3_node_start = d3.select("svg")
        .selectAll(".node")
        .data(nodes)
    var { d3nodes, d3boxes, d3texts, d3_node_start 
    } = realize_d3_nodes(d3_node_start.enter())
    window.graph_data.d3nodes = d3nodes
}

var d3_paint_links = () => {
    var u = d3.select("svg")
        .selectAll(".link")
        .data(window.graph_data.links)

    window.graph_data.d3links = u.enter().append("line")
        .attr("id", d => `link_${get_link_triplets(d)}`)
        .attr("class", d => `link link_start_${d[0]} link_end_${d[2]}`)
        .attr("data-start", d => d[0])
        .attr("data-end", d => d[0])
        .attr("style", style_config.line.deactive)
        .merge(u).on("click", link_active);

    // var line = link.append("line")

    window.graph_data.d3link_text = window.graph_data.d3links
        .append("text")
        .text(visualize_link)
}

var d3_re_paint = (callback) => {
    var d3_re_paint_ = () => {
        d3_paint_links()
        callback()
    }
    return d3_re_paint_
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