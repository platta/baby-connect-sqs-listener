# Baby Connect Project
This repository contains one part of a multi-part project to enable the
automation of adding data to the [Baby Connect](https://www.baby-connect.com)
service.

The flow is:

- User presses an AWS IoT Button.
- The IoT Button triggers an AWS Lambda function
([baby-connect-lambda](https://github.com/platta/baby-connect-lambda)).
- The Lambda function sends a message to an AWS SQS message queue.
- A Raspberry Pi running a listener (__baby-connect-sqs-listener__)
receives the message from the message queue.
- The listener uses a library
([baby-connect](https://github.com/platta/baby-connect)) to log into the Baby
Connect web site and add the data.

Since Baby Connect doesn't expose an API, the
([baby-connect](https://github.com/platta/baby-connect)) library uses browser
automation. This requires launching chromium as a child process which is not
supported in Lambda and is the reason we use a message queue with a standalone
listener application.

# baby-connect-sqs-listener

A Node.js server application to poll an AWS SQS message queue for messages used
to log activities in the [Baby Connect](https://www.baby-connect.com) service.

## Installation

```bashp
git clone https://github.com/platta/baby-connect-sqs-listener
cd baby-connect-sqs-listener
npm install
```

The application requires an available display for when it uses browser
automation. It can be run in a console window inside of an X Windows
session, or alongside Xvfb, a package that can be used to create a virtual
framebuffer.

```bashp
sudo apt-get install Xvfb
```

## Configuration

The config.default.json file shows all available configuration options. The ones
that are required are:

- `awsAccessKeyId` - Access Key Id for connecting to AWS SQS.
- `awsSecretAccessKey` - Secret Access Key for connecting to AWS SQS.
- `awsRegion` - The region in which the SQS queue resides.
- `queueUrl` - The url of the SQS queue.
- `babyConnectEmail` - E-mail address for the Baby Connect account.
- `babyConnectPassword` - Password for the Baby Connect account.

The AWS account or IAM user referenced by the Access Key ID and Secret Access
Key must have the following permissions on the SQS queue:

- sqs:DeleteMessage
- sqs:ReceiveMessage

## Usage

If you are running inside of X Windows, you can simply launch the application.

```bashp
node index
```

To use with Xvfb, you must first launch Xvfb to create a framebuffer, and when
you launch the application you must tell it which display to use via the DISPLAY
environment variable.

```bashp
Xvfb -ac -screen scrn 1280x1024x24 :9.0 &
DISPLAY=:9.0 node index
```

## Daemon

Included in the `daemon` folder is a shell script with instructions that you can
use to set up baby-connect-sqs-listener as a service on your Raspberry Pi.

__NOTE__ This doesn't work yet! 

## CloudFormation Template

In the `CloudFormation` folder there is a JSON file containing a CloudFormation
template that can be used to stand up the necessary resources in AWS for running
a Baby Connect SQS queue. The template will also create an IAM User and an
Access Key for that user, to be used by the baby-connect-sqs-listener
application.