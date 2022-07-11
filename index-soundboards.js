import { promises as fs } from 'node:fs'

const getDirectories = async source =>
  (await fs.readdir(source, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const getFiles = async source =>
    (await fs.readdir(source, { withFileTypes: true }))
      .filter(f => !f.isDirectory())
      .map(f => f.name)

const boards = await getDirectories("./soundboards")
await fs.writeFile(`./soundboards/soundboards.json`, JSON.stringify(boards))

for(let boardName of boards){
    const sounds = await getFiles(`./soundboards/${boardName}`)
    let board = {}
    try {
      board = JSON.parse(await fs.readFile(`./soundboards/${boardName}.json`))
    } catch(err){}

    sounds.forEach(sound => {
      if(!Object.values(board).some(key => key.sound === sound)){
        let freeIndex = 0;
        while(freeIndex in board && freeIndex < 64) freeIndex++;
        board[freeIndex] = { sound, color: freeIndex }
      }
    })

    console.log({ boardName, board, sounds })
    await fs.writeFile(`./soundboards/${boardName}.json`, JSON.stringify(board, null, "\t"))
}