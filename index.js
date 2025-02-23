"use strict"
const allowUpdates = false; // my safety check
const happeningsCMS = (!allowUpdates?"Import857":"Happenings"); // events

//import {getSecret} from 'wix-secrets-backend'; // if you run this as Velo
const {getSecret} = require('uuseCommons');
const axios = require('axios');
const wix_site_id  = "cdf3c1b4-d8d7-45c0-9c7d-d29b1e7040a8";
const memberId     = "ec4730ad-e548-4506-a477-ffeb2b7505ae";

const oosCategoryID    = "bfc3b900-ee7c-4ee0-9d48-76a5114f5a84"; // order of service
const sermonCategoryID = "730ae02c-ed05-43ff-9c8a-1b834c7f20e5"; // order of service

const categoryMap = [{key:oosCategoryID,name:'OOS'},{key:sermonCategoryID,name:'Sermon'}]

const oosWords = ['uuse virtual worship','oos','order of service'];
const sermonWords = ['josh pawelek','sermon'];

const commentableTagId = "69c8e9e0-d68a-4271-b85c-7a1f62909674"; // the tag ID for UUSE site

const EightDaysInMillis = 24 * 60 * 60 * 1000 * 8;
const EightDaysAgo = new Date(new Date().getTime() - EightDaysInMillis);

getSecret("UUSE_API_KEY")
.then ((Authorization)=>{
  const  headers = {
    "content-type": "application/json",
    Authorization,
    'wix-site-id':wix_site_id
    }

  const axiosDataTemplate = {
    baseURL: 'https://www.wixapis.com/wix-data/v2',
    method:  'post',
    headers,
    data: {
      dataCollectionId: happeningsCMS
    },
    timeout: 5000, 
    responseType: 'json', 
    responseEncoding: 'utf8', 
  }

  const blogDBQueryOptions = {
  method: "post",
  url: "https://www.wixapis.com/wix-data/v2/items/query",
  headers,
  data: {
    dataCollectionId: "Blog/Posts",
    query: {filter: { uuid: {$eq:"uuid"}}, // Corrected filter syntax
    paging: {
      limit: 2,  // Get 10 blog posts per request
      offset: 0   // Skip 0 items (for pagination)
    }}
  }
  }
  
function getServiceUpdateOptions(referringItemFieldName, referringItemId, referencedItemId, service) {
  service.data[referringItemFieldName] = referencedItemId;
  const x = clone(axiosDataTemplate);
    x.method = "put";
    x.url =  "items/"+referringItemId;
    x.data.dataItem = {data:service.data} 
  return x;
  };

async function updateService(fieldName,service_id,blog_ref_id,service){
    console.log("Updating Service",service.data.title, blog_ref_id)
    const serviceUpdateOptions = getServiceUpdateOptions(fieldName,service_id,blog_ref_id,service)
    return axios(serviceUpdateOptions)
    .then(results => {
      console.log("Update Service Results",results.status)
    })
    .catch(error =>{console.error("ERROR",error.status,error.response.data,serviceUpdateOptions)})
}

  const axiosBlogTemplate = {
    baseURL: 'https://www.wixapis.com/blog/v3',
    url   :  '/posts/query', // maybe should be drafts if updating
    method:  'post',
    headers,
    data: {
    },
    timeout: 5000, 
    responseType: 'json', 
    responseEncoding: 'utf8', 
  }

  const blogQueryOptions = {
    baseURL: 'https://www.wixapis.com/blog/v3',
    url   :  '/posts/query', // maybe should be drafts if updating
    method:  'post',
    headers,
    data: { filter:
      {$or:[
        {commentingEnabled: {$eq: true}},
        {featured: {$eq: true}}
      ] }},
    timeout: 5000, 
    responseType: 'json', 
    responseEncoding: 'utf8'
  }

function getBlogUpdateOptions(post_id) {
  return {
    ...clone(axiosBlogTemplate),
    url: `/draft-posts/${post_id}`,
    method: "patch",
    data: {
      action: "UPDATE_PUBLISH",
      draftPost: {
        id: post_id,
        memberId
      }
    }
  };
}

async function getService(date) {
  console.log("Searching for service event on date",date);
  const serviceQueryOptions  = clone(axiosDataTemplate);
  serviceQueryOptions.url    = '/items/query';
  serviceQueryOptions.data.query = {
    filter: {$and:[
        {isService: {$eq: true}},
        {date: {$eq: `${date}`}}
      ]
    }
  };
  return axios(serviceQueryOptions)  // ⬅️ Return the Promise
    .then(results => {
      let tmp = clone(results.data);
      tmp.dataItems[0].data.richcontent={};
      console.log("Found Service -",pretty(tmp));
      if (results.data.dataItems.length == 0) 
        return null; // Returns the single result
      if (results.data.dataItems.length == 1) {
        return results.data.dataItems[0]; // Returns the single result
      } else {
        throw new Error("Service Date Problem\n" + JSON.stringify(results.data.dataItems));
      }
    })
    .catch(error => {
      console.error("Error fetching service:", error);
      throw error; // Rethrow to handle it outside if needed
    });
}

//
// this looks for blog entries with tag isCommentable
// if found, it makes the blog entry commentable,\
// otherwise it forces no comments on the entry
//
// It also looks for expired Featured posts, and sets them to unfeatured after a week.
//
// It also fixes Annie in case she misses tagging it as the OOS by looking at keywords in the title
//
axios(blogQueryOptions)
  .then(function (response) {
    console.log(`Found ${response.data.posts.length} Candidate Blog Entries`);
    response.data.posts.forEach((post)=>{ 
      console.log("Matching Blog DB Entry",post.title)
      const blogUpdateOptions = getBlogUpdateOptions(post.id)
      const postDate = new Date((new Date(post.createdDate)).setHours(0,0,0,0));    
      const isOverEightDaysOld = (postDate.getMilliseconds() < EightDaysAgo.getMilliseconds()); 
      let blogChanged = (post.featured && (!isOverEightDaysOld));
      blogUpdateOptions.data.draftPost.featured &&= (!isOverEightDaysOld);
      console.log("Blog is featured and old",blogChanged,post.featured, isOverEightDaysOld);
      const hasOOSWordsInTitle = oosWords.some(s => post.title.toLowerCase().includes(s));
      const hasSermonWordsInTitle = sermonWords.some(s => post.title.toLowerCase().includes(s));
      const isCommentable = post.tagIds.includes(commentableTagId);
      blogChanged ||= (!isCommentable && post.commentingEnabled);
      blogUpdateOptions.data.draftPost.commentingEnabled = isCommentable;
      console.log("Blog changes due to commenting enabled",blogChanged,(!isCommentable && post.commentingEnabled))


      const title = post.title;
      const date = new Date(extractDate(post.title)).toISOString().substring(0,10);
      console.log("Blog Info",title,"\n - "+((hasSermonWordsInTitle)?"Is Sermon":""),
                  ((hasOOSWordsInTitle)?"Is OOS":""),
                  "and",((isCommentable)?"is Commentable":"is Not Commentable.")
                  ,"Date is",date);

      const uuid = post.id;
      blogDBQueryOptions.data.query.filter = {"uuid":{$eq:uuid}};

      axios(blogDBQueryOptions)
      .then(function(response2){
        if (response2.data.dataItems.length != 1){
          throw new Error(`Didn't find matching blog/post CMS entry. Found ${response2.data.dataItems.length}`);
        }
        const internalBlogID = response2.data.dataItems[0].data.internalId;
        getService(date) // just one should have been returned
        .then(service => {
          if (service == null) {
            console.log("There's no Service for this Blog Entry");
          } else {
            console.log(" Matching Service Title?",service?.data.title || `Not Found ${service}`);
            console.log(" Matching Service Date? ",service?.data.date  || `Not Found ${service}`);
            console.log(" Matching Service ID? "  ,service?.id     || `Not Found ${service}`);
            
            if (hasSermonWordsInTitle){
              blogUpdateOptions.data.draftPost.categoryIds = [sermonCategoryID];
              blogChanged = true;
              console.log("Blog changed because sermon found",blogChanged)
              updateService("sermon",service.id, internalBlogID, service); // post.id
            } 

            if (hasOOSWordsInTitle){
              blogUpdateOptions.data.draftPost.categoryIds = [oosCategoryID];
              blogChanged = true;
              console.log("Blog changed because OOS found",blogChanged)
              updateService("document",service.id, internalBlogID, service); // post.id
            } 
          }
          console.log("Blog Changes?",(blogChanged?"Yes":"No"),((allowUpdates?"Updating":"Not updating"),post.id));//,JSON.stringify(post,null,'\t')));        
          if (allowUpdates && blogChanged) { // this is just a way to turn this section on or off when debugging
            axios(blogUpdateOptions)
            .then(function (response) {
                console.log("update post",response.data.draftPost.title,"status",response.status);
            })
            .catch(function (error) {
              console.log("updated blog error",error);
            });
          }
        })
      })
    })
  })
  .catch(function (error) {
    console.error("ERROR",error);
  });
})


function extractDate(text) {
  const dateRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t\.?|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\b/i;
  const match = text.match(dateRegex);
  
  if (!match) return null;

  // Normalize month names (full and abbreviated) to a zero-based index
  const months = {
    "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5,
    "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11
  };

  const monthAbbr = match[0].slice(0, 3).toLowerCase(); // Get first 3 letters of matched month
  const day = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

  return new Date(year, months[monthAbbr], day);
}

function clone(x){return JSON.parse(JSON.stringify(x))};
function pretty(s){return JSON.stringify(s,null,2)}
function stop(){process.exit(0)}

//const newsTagId = "d99d124c-71b8-46c4-8ef9-4f534d713331"; // the tag ID for news
