//Send email function
module.exports.sendEmail = async function sendEmail(message, device, config) {
  //let bodyMessage = 'This is the email body! IP is: ' + device.host + ' ...add log information here if required...';
  let bodyMessage = message;
  
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.emailSender,
      pass: config.passEmailSender
    }
  });

  var mailOptions = {
      from: config.emailSender,
      to: config.emailReceiver,
      subject: message,
      text: bodyMessage
     };
  
  transporter.sendMail(mailOptions, function(error, info){
     if (error) {
       console.log(error);
     } else {
       console.log(' Email sent: ' + info.response);
     }
  });

  delete nodemailer;
  delete transporter;
  delete mailOptions;


}