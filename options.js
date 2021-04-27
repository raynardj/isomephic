import {pretty_json, ce,  dom_to_text, abbreviate_long_text} from "./easy_bs.js"

var byId = elementId => document.getElementById(elementId)
var idVal = elementId => byId(elementId).value

var save = (data) =>{
    console.info(`Saving data ${data}`)
    chrome.storage.sync.set(data)
}

var load_to_inputs = (data) =>{
    for(var k in data){
        if(data[k]){
            byId(k).value = data[k]
        }
    }
}

var short_url=(url)=>{
    return url.slice(0, url.indexOf("/db"))
}

var test_result = (data)=>{
    $("#test_result").html(pretty_json(data))
}

var test_connection=()=>{
    $("#test_result").html("")
    var url = idVal("url");
    console.log(`Testing log ${url}`)
    fetch(short_url(url))
    .then(res=>res.json())
    .then(test_result)
    .catch(console.error)
}

document.addEventListener("DOMContentLoaded", function(){
    
    console.log("option page loaded")

    document.getElementById("save_btn")
        .addEventListener("click",()=>{
            var save_data = {};
            $("input").each(function(){save_data[this.id]=this.value})
            save(save_data);
        })

    chrome.storage.sync.get(load_to_inputs)
})

byId("test_url").addEventListener("click", test_connection)