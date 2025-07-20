const fs = require('fs');
const path = require('path');

// Copy the logic from utils.ts to test it
function parseFrontmatter(fileContent) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  let match = frontmatterRegex.exec(fileContent)
  
  if (!match) {
    throw new Error('No frontmatter found in the file')
  }
  
  let frontMatterBlock = match[1]
  let content = fileContent.replace(frontmatterRegex, '').trim()
  let frontMatterLines = frontMatterBlock.trim().split('\n')
  let metadata = {}

  let currentKey = ''
  let currentValue = ''

  frontMatterLines.forEach((line) => {
    line = line.trim()
    
    // Check if this line starts a new key-value pair
    if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('\t')) {
      // Save previous key-value if exists
      if (currentKey) {
        let cleanValue = currentValue.trim().replace(/^['"](.*)['"]$/, '$1')
        metadata[currentKey] = cleanValue
      }
      
      // Start new key-value pair
      let [key, ...valueArr] = line.split(':')
      currentKey = key.trim()
      currentValue = valueArr.join(':').trim()
    } else if (currentKey && line) {
      // This is a continuation of the current value (multi-line)
      currentValue += ' ' + line.replace(/^['"](.*)['"]$/, '$1')
    }
  })

  // Don't forget the last key-value pair
  if (currentKey) {
    let cleanValue = currentValue.trim().replace(/^['"](.*)['"]$/, '$1')
    metadata[currentKey] = cleanValue
  }

  return { metadata, content }
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath) {
  let rawContent = fs.readFileSync(filePath, 'utf-8')
  
  // Skip empty files or files without frontmatter
  if (!rawContent.trim() || !rawContent.includes('---')) {
    console.log(`Skipping ${filePath}: empty or no frontmatter`)
    return null
  }
  
  try {
    return parseFrontmatter(rawContent)
  } catch (error) {
    console.warn(`Warning: Could not parse frontmatter in ${filePath}:`, error.message)
    return null
  }
}

function getMDXData(dir) {
  let mdxFiles = getMDXFiles(dir)
  console.log('Found MDX files:', mdxFiles)
  
  return mdxFiles
    .map((file) => {
      console.log(`Processing ${file}...`)
      let result = readMDXFile(path.join(dir, file))
      
      // Skip files that couldn't be parsed
      if (!result) {
        return null
      }
      
      let { metadata, content } = result
      let slug = path.basename(file, path.extname(file))

      console.log(`Successfully processed ${file} with slug: ${slug}`)
      console.log('Metadata:', metadata)

      return {
        metadata,
        slug,
        content,
      }
    })
    .filter(Boolean)
}

function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'))
}

// Test the function
console.log('Testing getBlogPosts()...')
const posts = getBlogPosts()
console.log('Number of posts found:', posts.length)
posts.forEach(post => {
  console.log(`- ${post.slug}: ${post.metadata.title}`)
})
