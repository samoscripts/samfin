const major = Number(process.versions.node.split('.')[0])

if (major < 20) {
  console.error(`Node.js >= 20 is required (current: ${process.versions.node}).`)
  console.error('Run: nvm use   (see frontend/.nvmrc)')
  process.exit(1)
}
