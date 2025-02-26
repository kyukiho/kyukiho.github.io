var posts=["2025/02/26/使用JavaScript编写动态脚本/","2025/02/24/流水账（大一上）/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };