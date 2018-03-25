var util = require('util')
var Promise = require('bluebird')
var streamToArray = require('stream-to-array')
var streamToArrayAsync = Promise.promisify(streamToArray)
const replace = require('string-replace-async')
var posterize = require('./lqip/posterize')

var fs = require('fs')
var tmp
try {
  tmp = fs.readFileSync('tmp.json').toString()
} catch (ex) {
  tmp = '{}'
}
var cache = JSON.parse(tmp)

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

function processHtmlFile(route, content) {
  return replace(content, /__LQIP_COLOR\([^\(]+\)/g, function (placeholder) {
    var mathes = placeholder.match(/__LQIP_COLOR\(([^\(]+)\)/)
    var url = mathes[1]

    return loadFileContent(route.get(url))
      .then(function (buffer) {
        if (cache[url]) { return cache[url] }

        hexo.log.info('Processing', url)
        return posterize(buffer, config.potrace)
      })
      .then(function (svg) {
        if (!cache[url]) cache[url] = svg
        fs.writeFileSync('tmp.json', JSON.stringify(cache))

        return "url('data:image/svg+xml," + encodeURI(svg) + "')"
      })
  })
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
  const options = {
    type: config.default_type || 'color',
    ...opts
}
  return '__LQIP_COLOR(' + path +')'
})
