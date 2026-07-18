import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** 获取所有已发布文章，按日期倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.PROD ? !data.draft : true);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 统计所有标签及其文章数量，按数量倒序 */
export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 按年、月分组归档 */
export async function getArchive(): Promise<
  { year: number; months: { month: number; posts: Post[] }[] }[]
> {
  const posts = await getPublishedPosts();
  const yearMap = new Map<number, Map<number, Post[]>>();
  for (const post of posts) {
    const y = post.data.date.getFullYear();
    const m = post.data.date.getMonth() + 1;
    if (!yearMap.has(y)) yearMap.set(y, new Map());
    const monthMap = yearMap.get(y)!;
    if (!monthMap.has(m)) monthMap.set(m, []);
    monthMap.get(m)!.push(post);
  }
  return [...yearMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthMap]) => ({
      year,
      months: [...monthMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, posts]) => ({ month, posts })),
    }));
}

/** URL 安全的标签片段 */
export function tagSlug(tag: string): string {
  return encodeURIComponent(tag.trim().toLowerCase().replace(/\s+/g, '-'));
}
