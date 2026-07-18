import rss from '@astrojs/rss';
import { getPublishedPosts } from '../utils/posts';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
