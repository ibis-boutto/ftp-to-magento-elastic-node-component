# FTP to Magento Elastic.io Node Component.js

## Description

This components allows you to connect you Elastic.io flow to an FTP Directory, fetch a loist of files, upload those files as attachments to the Elastic.io Cluster, and then send those attachment as images to Magento store.

## Why did we build this component?

Elastic.io does not provide a way to connect to an FTP server. They only provide SFTP connectors, so we needed to build our own component.

### How to use this coponent?

It is neccesary that you create an account in the Elastic.io iPass. Once on your account, you must create a Team, and a Repository. You will then push this code into that repo. Elastic.io will process your code and will generate a component that can be used in data flows.

## Triggers

### fetchFileList

This is a very important trigger. It will fetch a list of files under a specific FTP folder, and not only that, it will automatically upload those files to the Elastic.io Cluster and generate internal URL's that can be consumed by other components in the flow.

The output structure looks like this:

  {
    "type":"object",
    "properties": {
        "path":"string",
        "name":"string",
        "lastModified":"string",
        "attachmentUrl":"string",
        "size":"numeric"
    }
  }


## Actions

(comming soon)
