var util = require('util')
var Promise = require('bluebird')
var streamToArray = require('stream-to-array')
var streamToArrayAsync = Promise.promisify(streamToArray)
const replace = require('string-replace-async')
var getCache = require('./lqip/cache').getCache
var saveCache = require('./lqip/cache').saveCache
var types = require('./lqip/types')

var config = hexo.config.lqip || {}

function loadFileContent(stream) {
  return streamToArrayAsync(stream).then(function (parts) {
    const buffers = parts.map(function (part) {
      return util.isBuffer(part) ? part : Buffer.from(part)
    });

    return Buffer.concat(buffers);
  })
}

function isHtmlFile(filePath) {
  return filePath.match(/\.html$/)
}

function processType(route, content, type) {
  var name = types[type].name
  var generate = types[type].generate
  var serialize = types[type].serialize

  var regex = new RegExp('__' + name + '\\([^\\(]+\\)', 'g')

  return replace(content, regex, function (placeholder) {
    var mathes = placeholder.match('__' + name + '\\(([^\\(]+)\\)')
    var url = mathes[1]

    return loadFileContent(route.get(url))
      .then(function (buffer) {
        var cached = getCache(url, type)
        if (cached) { return cached }

        hexo.log.info('Processing', url)
        return generate(buffer, config[type])
      })
      .then(function (data) {
        saveCache(url, type, data)
        return serialize(data)
      })
  })
}

function processHtmlFile(route, content) {
  return processType(route, content, 'potrace')
}

hexo.extend.filter.register('after_generate', function () {
  var hexo = this
  var route = hexo.route
  var routes = route.list()
  var htmlFiles = routes.filter(isHtmlFile)

  return Promise.map(htmlFiles, function (filePath) {
    return loadFileContent(route.get(filePath)).then(function (buffer) {
      return route.set(filePath, function () {
        return processHtmlFile(route, buffer.toString())
      })
    })
  })
});

hexo.extend.helper.register('lqip_for', function (path, opts) {
  var options = Object.assign({
    type: config.default_type || 'color',
  }, opts)

  var name = types[options.type].name

  return '__' + name + '(' + path +')'
})
