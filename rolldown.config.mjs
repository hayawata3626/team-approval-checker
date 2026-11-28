// See: https://rolldown.rs/guide/getting-started

import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'rolldown'

/**
 * Reads the first file in `dir` whose name starts with `prefix`, ignoring case.
 * @param {string} dir The package directory.
 * @param {string} prefix The file name prefix, such as `license`.
 * @returns {string | null} The file contents, or `null` if there is none.
 */
function readFileByPrefix(dir, prefix) {
  const name = fs
    .readdirSync(dir)
    .sort()
    .find(file => file.toLowerCase().startsWith(prefix))
  return name ? fs.readFileSync(path.join(dir, name), 'utf-8') : null
}

/**
 * Formats a person field of `package.json` as `NAME <EMAIL> (URL)`.
 * @param {string | { name?: string, email?: string, url?: string }} person
 * @returns {string} The formatted person.
 */
function formatPerson(person) {
  if (typeof person === 'string') return person.trim()
  let text = `${person.name ?? null}`
  if (person.email) text += ` <${person.email}>`
  if (person.url) text += ` (${person.url})`
  return text
}

/**
 * Formats one bundled package in the same format as rollup-plugin-license.
 * @param {string} dir The package directory.
 * @returns {string} The license notice of the package.
 */
function formatPackage(dir) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')
  )
  const repository =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const contributors = [pkg.contributors ?? []].flat()
  const licenseText = readFileByPrefix(dir, 'licen')
  const noticeText = readFileByPrefix(dir, 'notice')

  const lines = [
    `Name: ${pkg.name}`,
    `Version: ${pkg.version}`,
    `License: ${pkg.license ?? null}`,
    `Private: ${pkg.private ?? false}`
  ]
  if (pkg.description) lines.push(`Description: ${pkg.description}`)
  if (repository) lines.push(`Repository: ${repository}`)
  if (pkg.homepage) lines.push(`Homepage: ${pkg.homepage}`)
  if (pkg.author) lines.push(`Author: ${formatPerson(pkg.author)}`)
  if (contributors.length > 0) {
    lines.push(
      'Contributors:',
      ...contributors.map(c => `  ${formatPerson(c)}`)
    )
  }
  if (licenseText) lines.push('License Text:', '===', '', licenseText, '')
  if (noticeText) lines.push('Notice:', '===', '', noticeText, '')
  return lines.join('\n').trim()
}

/**
 * Writes the licenses of the bundled third-party packages to `file`.
 * @param {string} file The output file, relative to the project root.
 * @returns {import('rolldown').Plugin} The plugin.
 */
function thirdPartyLicenses(file) {
  return {
    name: 'third-party-licenses',
    generateBundle(_options, bundle) {
      const dirs = new Set()
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        for (const id of chunk.moduleIds) {
          const match =
            /^(.*[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
          if (match) dirs.add(match[1])
        }
      }
      // The same version of a package can be installed in several places.
      const notices = [...new Set([...dirs].map(formatPackage))]
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, notices.join('\n\n---\n\n'))
    }
  }
}

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [thirdPartyLicenses('dist/licenses.txt')]
})
