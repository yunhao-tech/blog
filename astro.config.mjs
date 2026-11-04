import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      transformers: [{
        pre(node) { node.properties['data-language'] = this.options.lang || 'text'; }
      }]
    }
  },
  site: process.env.BLOG_SITE || 'https://example.com',
  base: process.env.BLOG_BASE || '/',
  trailingSlash: 'always'
});
