const AWS = require('aws-sdk');
const {
  S3_BUCKET_NAME,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_REGION
} = require('../config/config');

const config = new AWS.Config({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_REGION
});

const client = new AWS.Rekognition(config);

const baseParams = (photoName) => ({
  Image: {
    S3Object: {
      Bucket: S3_BUCKET_NAME,
      Name: photoName
    },
  }
});

const detectInappropriate = (photoName) => new Promise((resolve, reject) => {
  client.detectModerationLabels({ ...baseParams(photoName), MinConfidence: 60 }, (err, response) => {
    if (err) {
      reject(err);

      return;
    }

    const isInappropriate = response?.ModerationLabels.length > 0;

    resolve(isInappropriate);
  });
});

const detectFaces = (photoName) => new Promise((resolve, reject) => {
  client.detectFaces({ ...baseParams(photoName), Attributes: ['DEFAULT'] }, (err, response) => {
    if (err) {
      reject(err);

      return;
    }

    const hasFaces = (Array.isArray(response?.FaceDetails) ? response.FaceDetails : []).filter(({ Confidence }) => Confidence >= 60).length > 0;

    resolve(hasFaces);
  });
});

const compareFaces = (sourcePhoto, targetPhoto) => new Promise((resolve, reject) => {
  const params = {
    SourceImage: {
      S3Object: {
        Bucket: S3_BUCKET_NAME,
        Name: sourcePhoto
      },
    },
    TargetImage: {
      S3Object: {
        Bucket: S3_BUCKET_NAME,
        Name: targetPhoto
      },
    },
    SimilarityThreshold: 70
  };

  client.compareFaces(params, (err, response) => {
    if (err) {
      reject(err);

      return;
    }

    const faceMatches = (Array.isArray(response?.FaceMatches) ? response.FaceMatches : []).filter(({ Similarity }) => Similarity >= 60).length > 0;

    resolve(faceMatches);
  });
});

module.exports = {
  detectFaces,
  detectInappropriate,
  compareFaces
};
