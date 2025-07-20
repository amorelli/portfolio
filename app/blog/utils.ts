import fs from 'fs'
import path from 'path'

type Metadata = {
  title: string
  publishedAt: string
  summary: string
  image?: string
}

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  let match = frontmatterRegex.exec(fileContent)
  
  if (!match) {
    throw new Error('No frontmatter found in the file')
  }
  
  let frontMatterBlock = match[1]
  let content = fileContent.replace(frontmatterRegex, '').trim()
  let frontMatterLines = frontMatterBlock.trim().split('\n')
  let metadata: Partial<Metadata> = {}

  let currentKey = ''
  let currentValue = ''

  frontMatterLines.forEach((line) => {
    line = line.trim()
    
    // Check if this line starts a new key-value pair
    if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('\t')) {
      // Save previous key-value if exists
      if (currentKey) {
        let cleanValue = currentValue.trim().replace(/^['"](.*)['"]$/, '$1')
        metadata[currentKey as keyof Metadata] = cleanValue
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
    metadata[currentKey as keyof Metadata] = cleanValue
  }

  return { metadata: metadata as Metadata, content }
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath) {
  let rawContent = fs.readFileSync(filePath, 'utf-8')
  
  // Skip empty files or files without frontmatter
  if (!rawContent.trim() || !rawContent.includes('---')) {
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
  return mdxFiles
    .map((file) => {
      let result = readMDXFile(path.join(dir, file))
      
      // Skip files that couldn't be parsed
      if (!result) {
        return null
      }
      
      let { metadata, content } = result
      let slug = path.basename(file, path.extname(file))

      return {
        metadata,
        slug,
        content,
      }
    })
    .filter(Boolean) // Remove null entries
}

export function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'))
}

export function formatDate(date: string, includeRelative = false) {
  let currentDate = new Date()
  if (!date.includes('T')) {
    date = `${date}T00:00:00`
  }
  let targetDate = new Date(date)

  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear()
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth()
  let daysAgo = currentDate.getDate() - targetDate.getDate()

  let formattedDate = ''

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`
  } else {
    formattedDate = 'Today'
  }

  let fullDate = targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!includeRelative) {
    return fullDate
  }

  return `${fullDate} (${formattedDate})`
}
