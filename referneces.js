function removeReference(){
 const remOptions = clone(axiosDataTemplate);
      remOptions.method = "post";
      remOptions.url    = "/bulk/items/remove-references";  // Ensure the correct endpoint
      remOptions.data = {
        dataCollectionId: happeningsCMS,
        dataItemReferences: [{
            referringItemFieldName: "multireference", // The field in the CMS
            referringItemId:    'a6fc9dcc-fe33-4475-9117-fcd357be71e1',
            referencedItemId:   '3e223674-33a5-449a-a9d9-abcc48e2cee3'}
          ]
        }
      axios(remOptions)
      .then(result=>{
        console.log("Deleted Reference",result.data.results)
      })
      .catch(error=>{console.error("Ref Failed",error)})
  //
  // this gets it
  //
}


function getReference(serviceID, blogID){
//  removeReference();
 const refOptions = clone(axiosDataTemplate);
      refOptions.method = "post";
      refOptions.url    = "/items/query-referenced";  // Ensure the correct endpoint
      refOptions.data = {
        dataCollectionId: happeningsCMS,
        referringItemFieldName: "multireference", // The field in the CMS
        referringItemId: serviceID,              // The item that will reference another item
//        referencedItemId: blogID               // Ensure this is an array for multi-references
      };
      axios(refOptions)
      .then(results=>{
        results.data.results.forEach(result=>{
          if (result.dataItem)
          console.log("Blog ID",result.dataItem.id);
          else
          console.log("Blog ID undefined",result)
        })
        stop();
        return results.data.results[results.data.results.length-1].dataItem.data._id;
      })
      .catch(error=>{console.error("Ref Failed",error)})
  //
  // this gets it
  //
}



async function getReference2(serviceID, blogID){
  console.log("insert ref",serviceID,blogID);
 const refOptions = clone(axiosDataTemplate);
      refOptions.method = "post";
      refOptions.url    = "/items/insert-reference";  // Ensure the correct endpoint
      refOptions.data = {
        dataCollectionId: happeningsCMS,
        dataItemReference: {
          referringItemFieldName: "multireference", // The field in the CMS
          referringItemId:  serviceID,              // The item that will reference another item
          referencedItemId: blogID                // Ensure this is an array for multi-references
        }
      };
      axios(refOptions)
      .then(results=>{
        console.log("Blog ID",results);//[0].dataItem.data._id);
        stop();
        return results.data.results[results.data.results.length-1].dataItem.data._id;
      })
      .catch(error=>{console.error("Ref Failed",error)})
  //
  // this gets it
  //
}
