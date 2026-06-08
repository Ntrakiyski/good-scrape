export interface Page {
	url: string
	title: string
	markdown: string
}

export interface EcoPage extends Page {
	slug: string
	isProduct?: boolean
	category?: string
}

export const frontmatter = (title: string, url: string) =>
	`---\ntitle: "${title.replace(/"/g, '\\"')}"\nurl: "${url}"\n---\n\n`

export const productFrontmatter = (title: string, url: string, slug: string) =>
	`---\ntitle: "${title.replace(/"/g, '\\"')}"\nurl: "${url}"\nslug: "${slug}"\n---\n\n`
