var json_options = {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
    }
}

var byId = elementId => document.getElementById(elementId)
var idVal = elementId => byId(elementId).value
var height=600;
var width=800;

var set_config = (config) => {
    window.iso_config = config
}

chrome.storage.sync.get(set_config)

var transaction = (data, callback = console.log,
    error_handler = console.error) => {
    var config = window.iso_config
    var { url, name_kw, id_kw } = config;
    fetch(url, {
        ...json_options,
        body: JSON.stringify(data)
    }).then(res => res.json())
    .then(callback)
    .catch(error_handler)
}

var visualize_node =(node)=> {
    return node.row[0].name
}

// force simulator
var simulation = d3.forceSimulation();

function dragended(e,d) {
    if (!e.active) simulation.alphaTarget(0.0001);
    d.fx = null; d.fy = null;
  }

function dragstarted(e,d){
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          }
          
function dragged(e,d){
            d.fx = e.x; d.fy = e.y;
          }

var initializeSimulation = (simulation, nodes) => {
            simulation.nodes(nodes);
            initializeForces(simulation);
            simulation.on("tick", ticked);
          }

var initializeForces = (simulation) =>{
            // add forces and associate each with a name
            simulation
                .force("link", d3.forceLink())
                .force("charge", d3.forceManyBody())
                .force("collide", d3.forceCollide())
                .force("center", d3.forceCenter())
                .force("forceX", d3.forceX())
                .force("forceY", d3.forceY());
            // apply properties to each of the forces
            updateForces(simulation);
        }
var ticked =()=> {
            // window.link
            //     .attr("x1", function(d) { return d.source.x; })
            //     .attr("y1", function(d) { return d.source.y; })
            //     .attr("x2", function(d) { return d.target.x; })
            //     .attr("y2", function(d) { return d.target.y; });
        
            window.d3nodes
                .attr("x", function(d) { return d.x; })
                .attr("y", function(d) { return d.y; });
            // d3.select('#alpha_value').style('flex-basis', (simulation.alpha()*100) + '%');
        }
// values for all forces
var forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    charge: {
        enabled: true,
        strength: -30,
        distanceMin: 1,
        distanceMax: 2000
    },
    collide: {
        enabled: true,
        strength: .7,
        iterations: 1,
        radius: 5
    },
    forceX: {
        enabled: false,
        strength: .1,
        x: .5
    },
    forceY: {
        enabled: false,
        strength: .1,
        y: .5
    },
    link: {
        enabled: true,
        distance: 30,
        iterations: 1
    }
}

var updateForces = (simulation) => {
            // get each force by name and update the properties
            simulation.force("center")
                .x(width * forceProperties.center.x)
                .y(height * forceProperties.center.y);
            simulation.force("charge")
                .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
                .distanceMin(forceProperties.charge.distanceMin)
                .distanceMax(forceProperties.charge.distanceMax);
            simulation.force("collide")
                .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
                .radius(forceProperties.collide.radius)
                .iterations(forceProperties.collide.iterations);
            simulation.force("forceX")
                .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
                .x(width * forceProperties.forceX.x);
            simulation.force("forceY")
                .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
                .y(height * forceProperties.forceY.y);
            simulation.force("link")
                .id(function(d) {return d.id;})
                .distance(forceProperties.link.distance)
                .iterations(forceProperties.link.iterations)
                .links(forceProperties.link.enabled ? window.links : []);
        
            // updates ignored until this is run
            // restarts the simulation (important if simulation has already slowed down)
            simulation.alpha(1).restart();
        }
                 
var updateDisplay = (node, link) => {
            node
                .attr("r", forceProperties.collide.radius)
        
            // link
            //     .attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
            //     .attr("opacity", forceProperties.link.enabled ? 1 : 0);
        }

var updateAll = () =>{
    updateDisplay(window.d3nodes, window.d3links);
    updateForces(simulation)
}
var visualize_nodes = () =>{
    var nodes = window.nodes

    var u = d3.select("svg")
    .selectAll(".node")
    .data(nodes)

    initializeSimulation(simulation,nodes)

    var node = u.enter().append("rect")
    .attr("className", "node")
    .attr("width", "200")
    .attr("height", "100")
    .attr("x","20").attr("y","20")
    .attr("rx","20").attr("ry","20")
    .attr("style","fill:rgba(255,255,255,0.6);stroke:black;strock-width:10")
    .merge(u)
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    window.d3nodes = node;

    node.append("text")
    .attr("x","50%")
    .attr("y","50%")
    .attr("alignment-baseline","middle")
    .attr("text-anchor","middle")
    .attr("fill","black")
    .text(visualize_node)

    updateDisplay(node, {})
}

var visualize_result = (res) =>{
    var {errors, results} = res
    if(errors.length>0){
        for(var i in errors){console.error(errors[i])}
        return
    }
    window.nodes = results[0]['data'];
    window.links = []
    visualize_nodes()
}

var process_input = () => {
    search_name(idVal("search"), visualize_result, console.error)
}

var search_name = (text, callback, error_handler) => {
    transaction({
        statements: [
            {
                statement: `
                MATCH (n {${window.iso_config.name_kw}:'${text}'})
                RETURN n LIMIT 20`,
                parameters: {},
            },
        ]
    }, callback, error_handler)
}

byId("search_btn").addEventListener("click", process_input)