import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// Generates /rss.xml — this is what readers subscribe to in feed readers,
// and what services like Zapier/IFTTT watch to auto-post new articles to
// social media. Free audience distribution, basically.
export async function GET(context) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'UAP Times',
    description: 'UAP news, filed from the edge of the known.',
    site: context.site,
    items: articles.map((article) => ({
      title: article.data.title,
      pubDate: article.data.pubDate,
      description: article.data.description,
      author: article.data.author,
      categories: [article.data.topic, ...article.data.tags],
      link: `/articles/${article.id}/`,
    })),
    customData: `<language>en-gb</language>`,
  });
}
