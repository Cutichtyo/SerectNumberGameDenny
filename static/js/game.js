/* ================= VARIABLES ================= */

const board = document.getElementById("board")

let secret = []
let attempts = 0

let gameStarted = false
let gameFinished = false

/* ================= SUPABASE ================= */

const supabaseClient = window.supabase.createClient(
CONFIG.SUPABASE_URL,
CONFIG.SUPABASE_KEY
)

/* ================= MUSIC SYSTEM ================= */

let music = new Audio()
let currentSongIndex = 0
let musicStarted = false

function playMusic(){

if(!CONFIG.ENABLE_MUSIC) return

music.pause()

music = new Audio(CONFIG.MUSIC_LIST[currentSongIndex])

music.volume = document.getElementById("volumeSlider")?.value || CONFIG.MUSIC_DEFAULT_VOLUME

music.play()

musicStarted = true

music.onended = ()=>{

currentSongIndex++

if(currentSongIndex >= CONFIG.MUSIC_LIST.length){
currentSongIndex = 0
}

playMusic()

}

}

function changeMusic(){

let select = document.getElementById("musicSelect")

currentSongIndex = parseInt(select.value)

playMusic()

}

function toggleMusic(){

if(!musicStarted){
playMusic()
return
}

if(music.paused){
music.play()
}else{
music.pause()
}

}

function changeVolume(){

let slider = document.getElementById("volumeSlider")

music.volume = slider.value

}

function startMusicIfNeeded(){

if(CONFIG.MUSIC_AUTOPLAY){
playMusic()
}

}

/* ================= SECRET NUMBER (NO DUPLICATE) ================= */

function generateSecret(){

secret = []

let digits = [0,1,2,3,4,5,6,7,8,9]

for(let i=0;i<CONFIG.NUMBER_LENGTH;i++){

let index = Math.floor(Math.random()*digits.length)

secret.push(digits[index])

digits.splice(index,1)

}

}

/* ================= START GAME ================= */

function startGame(){

let name = document.getElementById("playerName").value.trim()

if(name === ""){

alert("Enter name")

return

}

generateSecret()

attempts = 0

gameStarted = true
gameFinished = false

createBoard()

startMusicIfNeeded()

loadLeaderboard()

}

/* ================= CREATE BOARD ================= */

function createBoard(){

board.innerHTML = ""

for(let r=0;r<CONFIG.MAX_ATTEMPTS;r++){

let row = document.createElement("div")

row.className = "row"

let label = document.createElement("div")

label.className = "row-number"

label.innerText = "#" + (r+1)

row.appendChild(label)

for(let c=0;c<CONFIG.NUMBER_LENGTH;c++){

let cell = document.createElement("div")

cell.className = "cell"

row.appendChild(cell)

}

board.appendChild(row)

}

}

/* ================= SUBMIT GUESS ================= */

function submitGuess(){

if(!gameStarted) return
if(gameFinished) return

let guess = document.getElementById("guessInput").value

if(guess.length !== CONFIG.NUMBER_LENGTH){

alert("Enter "+CONFIG.NUMBER_LENGTH+" digits")

return

}

let guessArr = guess.split("").map(Number)

updateRow(guessArr)

attempts++

if(checkWin(guessArr)){

gameFinished = true

saveWin()

alert("🎉 Bạn đã đoán đúng!")

return

}

if(attempts >= CONFIG.MAX_ATTEMPTS){

gameFinished = true

saveLose()

alert("❌ Hết lượt! Số bí mật là: "+secret.join(""))

}

}

/* ================= UPDATE ROW (WORDLE LOGIC) ================= */

function updateRow(guess){

let row = board.children[attempts]

let secretCopy = [...secret]
let guessCopy = [...guess]

/* PASS 1 correct */

for(let i=0;i<CONFIG.NUMBER_LENGTH;i++){

let cell = row.children[i+1]

cell.innerText = guess[i]

if(secretCopy[i] === guessCopy[i]){

cell.classList.add("correct")

secretCopy[i] = null
guessCopy[i] = null

}

}

/* PASS 2 exist */

for(let i=0;i<CONFIG.NUMBER_LENGTH;i++){

if(guessCopy[i] === null) continue

let cell = row.children[i+1]

let index = secretCopy.indexOf(guessCopy[i])

if(index !== -1){

cell.classList.add("exist")

secretCopy[index] = null

}else{

cell.classList.add("wrong")

}

}

}

/* ================= CHECK WIN ================= */

function checkWin(guess){

for(let i=0;i<CONFIG.NUMBER_LENGTH;i++){

if(secret[i] !== guess[i]) return false

}

return true

}

/* ================= LEADERBOARD ================= */

async function saveWin(){

let name = document.getElementById("playerName").value

let {data,error} = await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.select("*")
.eq("name",name)
.order("streak",{ascending:false})
.limit(1)

if(!data || data.length === 0){

await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.insert([{name:name,streak:1}])

}else{

let player = data[0]

let newStreak = (player.streak || 0) + 1

await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.update({streak:newStreak})
.eq("id",player.id)

}

loadLeaderboard()

}

async function saveLose(){

let name = document.getElementById("playerName").value

let {data} = await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.select("*")
.eq("name",name)
.order("streak",{ascending:false})
.limit(1)

if(data && data.length > 0){

await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.update({streak:0})
.eq("id",data[0].id)

}

loadLeaderboard()

}

async function loadLeaderboard(){

let {data} = await supabaseClient
.from(CONFIG.LEADERBOARD_TABLE)
.select("*")
.order("streak",{ascending:false})
.limit(CONFIG.LEADERBOARD_LIMIT)

renderLeaderboard(data)

}

function renderLeaderboard(data){

let div = document.getElementById("leaderboard")

div.innerHTML = ""

data.forEach((p,i)=>{

let row = document.createElement("div")

row.innerText = (i+1)+". "+p.name+" 🔥 "+p.streak

if(i===0) row.className="gold"
if(i===1) row.className="silver"
if(i===2) row.className="bronze"

div.appendChild(row)

})

}

/* ================= INIT ================= */


loadLeaderboard()

