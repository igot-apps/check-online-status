const axios = require('axios');

// Function to make a POST request
async function sendEmail(data) {
    console.log(data);
  try {
    // Define the URL and the body data
    const url = 'https://igot-alert.onrender.com/send-email';
    // const data = {
    //   subject: 'agort offline2',
    //   message: 'Hello Boss, your bybit ard is offline .',
    //   recipientEmail: 'aagortey@gmail.com'
    // };

    // Make the POST request using Axios
    const response = await axios.post(url, data);

    // Log the response data
    console.log('Response:', response.data);
  } catch (error) {
    // Log any errors
    console.error('Error occurred:', error.message);
  }
}

module.exports = { sendEmail };