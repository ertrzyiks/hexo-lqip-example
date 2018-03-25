var Promise = require('bluebird')
var potrace = require('potrace')
var sharp = require('sharp')
var posterize = Promise.promisify(potrace.posterize)
var svgo = require('./svgo')()

module.exports = function (buffer, options) {
  return sharp(buffer)
    .resize(140)
    .toBuffer()
    .then(function (buffer) {
      return posterize(buffer, options)
    })
    .then(function (data) {
      return svgo.optimize(data).then(function (result) {
        return result.data
      })
    })
}
