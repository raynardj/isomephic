const byId = elementId => document.getElementById(elementId)
const idVal = elementId => byId(elementId).value

const get_idx = d => d.row[0].idx;

const shorten = text => {
    if(text==null){return ''}
    else if (text.length<15){return text}
    else{
        return `${text.slice(0,15)}...`
    }
}

const get_link_triplets = (d) => {
    return `${d[0]}_${d[1].idx}_${d[2]}`
}

const json_options = {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
    }
}

const style_config = {
    node: {
        active: "fill:rgba(255,200,80,0.6);stroke:rgba(200,120,80,0.6);stroke-width:5",
        active2: "fill:rgba(255,255,80,0.6);stroke:rgba(200,180,20,0.6);stroke-width:5",
        deactive: "fill:rgba(130,190,180,0.6);stroke:rgba(70,120,230,0.6);stroke-width:3"
    },
    line: {
        active: "stroke:url(#link_gradient);stroke-width:5;opacity:0.8",
        deactive: "stroke:url(#link_gradient);stroke-width:3;opacity:0.5"
    }
}

var set_config = (config) => { window.iso_config = config };

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
    // console.info(`tx data ${JSON.stringify(data, null, 2)}`)
    var config = window.iso_config
    var { url, name_kw, id_kw } = config;
    fetch(url, {
        ...json_options,
        body: JSON.stringify(data)
    }).then(res => res.json())
        .then(callback)
        .catch(error_handler)
}

export {get_idx, shorten, get_link_triplets, transaction, style_config, byId, idVal}