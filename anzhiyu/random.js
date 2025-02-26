var posts=["2024/02/25/categories/","2025/02/24/生活日常/流水账（大一上）/","2025/02/26/前端开发/使用JavaScript编写动态脚本/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };