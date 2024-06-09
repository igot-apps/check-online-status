require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");
const fs = require('fs');
const { sendEmail } = require("./sendEmail");

const app = express();

const PORT = process.env.PORT || 7000;

let stopEmails = false;
let browserInstance;

const checkUserOnlineStatus = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    ],
    executablePath: process.env.NODE_ENV === "production"
      ? process.env.PUPPETEER_EXECUTABLE_PATH
      : puppeteer.executablePath(),
    headless: false
  });
  try {
    const page = await browser.newPage();

    await page.goto("https://www.bybit.com/fiat/trade/otc/?actionType=1&token=USDT&fiat=GHS&paymentMethod=",{ timeout: 60000, waitUntil: 'networkidle0' });

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // Save the HTML content for debugging
    const html = await page.content();
    fs.writeFileSync('page_content.html', html);   

 // Increase the timeout and add debugging
 await page.waitForSelector('.ant-space.css-7o12g0.ant-space-vertical', { timeout: 60000 });

 const itemsData = await page.evaluate(() => {
     const items = Array.from(document.querySelectorAll('.ant-space.css-7o12g0.ant-space-vertical'));
     return items.map(item => item.innerText);
 });

 console.log(itemsData); // Output the scraped data to the console

 // Check if user is online
 const user = "igot_btc";
 let isUserAvailable;
 let isUserOnline;

 isUserAvailable = findPhraseInArray(itemsData, user);
 isUserOnline = findPhraseInArray(itemsData, user + "\nOnline");

 if (isUserAvailable && isUserOnline) {
     console.log(`${user} is available and online`);
 } else {
  console.log("about to send email")
    //Logic to send email to user to notify him to come online
     if (stopEmails == false) {
         sendEmail({
             subject: 'offline come online',
             message: 'Hello Boss, your bybit card is offline.',
             recipientEmail: 'aagortey@gmail.com'
         });
     }
     console.log('User is either offline or not available on the page');
 }

 await page.close();
  } catch (e) {
    
    console.error(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    // await browser.close();
  }
};

checkUserOnlineStatus();

// Define the root route
app.get('/', (req, res) => {
  res.send('Puppeteer bybit user online status checker runing  !');
});

app.get('/stop-emails', (req, res) => {
  stopEmails = true;
  console.log('Email sending is disabled');
  res.send('Email sending is disabled');
});

app.get('/resume-emails', (req, res) => {
  stopEmails = false;
  console.log('Email sending is resumed');
  res.send('Email sending resumed!');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

// Helper function to find a phrase in an array
function findPhraseInArray(array, phrase) {
  return array.some(item => item.includes(phrase));
}
