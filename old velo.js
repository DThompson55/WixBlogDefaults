const axios = require('axios');
import {getSecret} from 'wix-secrets-backend';

//
// this looks for blog entries with tag isCommentable
// if found, it makes the blog entry commentable,\
// otherwise it forces no comments on the entry
//
// It also looks for expired Featured posts, and sets them to unfeatured after a week.
//
// It also fixes Annie in case she misses tagging it as the OOS by looking at keywords in the title
//


var allowUpdates = true; // my safety check

export function setBlogDefaults() {
  console.log("Running 'set Blog Defaults, sets no comments, and also OOS category' with allowUpdate=",allowUpdates);

  getSecret("UUSE_API_KEY")
  .then ((mySecret)=>{

const site_id  = "cdf3c1b4-d8d7-45c0-9c7d-d29b1e7040a8";
const member_id= "ec4730ad-e548-4506-a477-ffeb2b7505ae";

const  headers = {
  "content-type": "application/json",
  "Authorization": mySecret,
  'wix-site-id':   site_id
  }

//const newsTagId = "d99d124c-71b8-46c4-8ef9-4f534d713331"; // the tag ID for news
const commentableTagId = "69c8e9e0-d68a-4271-b85c-7a1f62909674"; // the tag ID for UUSE site

const options = {
  url: '/draft-posts/query',
  method:  'post', 
  baseURL: 'https://www.wixapis.com/blog/v3',
  headers: headers,
  data: {    
    filter: {$and:[
      {status:{$eq:"PUBLISHED"}},
      {$or:[
        {commentingEnabled: {$eq: true}},
        {featured: {$eq: true}}
        ]
      },
      {$not: {tagIds:{$hasSome: [commentableTagId]}}} // a side effecct is that featured blogs that are commentable will not expire?
      ]
    },
        paging: {
            limit: 50,
            offset: 0
        }
  },
  timeout: 5000, 
  responseType: 'json', 
  responseEncoding: 'utf8', 
}
axios(options)
  .then(function (response) {
    response.data.draftPosts.forEach((post)=>{ 
      console.log("Found",post.title);
          var str = post.title.toLowerCase()
          const arr = ['uuse virtual worship','oos','order of service'];
          const oosCategoryID = "bfc3b900-ee7c-4ee0-9d48-76a5114f5a84"; // order of service
          
          var postDate = new Date(post.createdDate)
          postDate.setHours(0,0,0,0);
          const sevenDaysInMillis = 24 * 60 * 60 * 1000 * 7;
          const sevenDaysAgo = new Date(new Date().getTime() - sevenDaysInMillis);
          
          var isRecent = (postDate > sevenDaysAgo);
          //const categoryIncludesOOS = post.categoryIds.includes(oosCategoryID);
          const categoryIsEmpty = (post.categoryIds.length == 0);
          const hasAnyKeyWordsInTitle = arr.some(searchString => str.includes(searchString));

        var upoptions = {
          url: '/draft-posts/'+post.id,
          method: 'patch', 
          baseURL: 'https://www.wixapis.com/blog/v3',
          headers: headers,
          data: {  
          "action": "UPDATE_PUBLISH",
          "draftPost": {
            // "id":post.id,  
            // "memberId":member_id,
            // "commentingEnabled": (post.tagIds.includes(commentableTagId)),
          }},
          timeout: 5000, 
          responseType: 'json', 
          responseEncoding: 'utf8', 
        };

        upoptions.data.draftPost = {};
        upoptions.data.draftPost.id = post.id;
        upoptions.data.draftPost.memberId = member_id;
        upoptions.data.draftPost.commentingEnabled = false;

      if (categoryIsEmpty && hasAnyKeyWordsInTitle && isRecent){
        upoptions.data.draftPost.categoryIds = [oosCategoryID];
      }

      if (!isRecent){
        if (post.featured) {
          upoptions.data.draftPost.featured = false;
        }
        // if (post.tagIds.includes(newsTagId)) {
        //    upoptions.data.draftPost.tagIds = []; // remove news category
        // }
      }
   
      if (allowUpdates) // this is just a way to turn this section on or off when debugging
      console.log("updating",JSON.stringify(post,null,'\t'));
        
      if (allowUpdates) // this is just a way to turn this section on or off when debugging
      axios(upoptions)
      .then(function (response) {
          console.log("update post",response.data.draftPost.title,"status",response.status);
      })
      .catch(function (error) {
        console.log("updated blog error",error);
      });
    })
  })
  .catch(function (error) {
    console.log(error);
  });
})
}