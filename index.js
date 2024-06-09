require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");
const fs = require('fs');
const { sendEmail } = require("./sendEmail");

const app = express();

const PORT = process.env.PORT || 7000;

let stopEmails = false;
let browserInstance;

const MAX_RETRIES = 3;

const initializeBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
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
      headless: true
    });
  }
};

const retryOperation = async (operation, retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed. Retrying...`);
    }
  }
};

const checkUserOnlineStatus = async () => {
  try {
    await initializeBrowser();
    const page = await browserInstance.newPage();
    await page.setDefaultNavigationTimeout(120000); // Set default navigation timeout to 2 minutes

    try {
      await retryOperation(() => page.goto("https://www.bybit.com/fiat/trade/otc/?actionType=1&token=USDT&fiat=GHS&paymentMethod=", { waitUntil: 'networkidle2' }));
    } catch (error) {
      console.error(`Navigation timeout: ${error.message}`);
      await page.close();
      return;
    }

    await page.setViewport({ width: 1080, height: 1024 });

    const html = await page.content();
    fs.writeFileSync('page_content.html', html);

    try {
      await retryOperation(() => page.waitForSelector('.ant-space.css-7o12g0.ant-space-vertical'));
    } catch (error) {
      console.error(`Selector timeout: ${error.message}`);
      await page.close();
      return;
    }

    const itemsData = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ant-space.css-7o12g0.ant-space-vertical'));
      return items.map(item => item.innerText);
    });

    console.log(itemsData); // Output the scraped data to the console

    const user = "igot_btc";
    const isUserAvailable = findPhraseInArray(itemsData, user);
    const isUserOnline = findPhraseInArray(itemsData, user + "\nOnline");

    if (isUserAvailable && isUserOnline) {
      console.log(`${user} is available and online`);
    } else {
      console.log("about to send email");
      if (!stopEmails) {
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
    console.error(`Something went wrong while running Puppeteer: ${e.message}`);
  }
};

checkUserOnlineStatus();
setInterval(checkUserOnlineStatus, 2 * 60 * 1000);

app.get('/', (req, res) => {
  res.send('Puppeteer bybit user online status checker running!');
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

function findPhraseInArray(array, phrase) {
  return array.some(item => item.includes(phrase));
}
