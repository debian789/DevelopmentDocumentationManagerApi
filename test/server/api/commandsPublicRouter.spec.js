'use strict'
var futures = require('futures')
var request = require('supertest')
var expect = require('chai').expect
let chai = require('chai');
let chaiHttp = require('chai-http');
var mongoose = require('mongoose')
var async = require('async')
var jwt = require('jsonwebtoken')
var mockgoose = require('mockgoose')
let request2 = require('request')
mockgoose(mongoose)
chai.use(chaiHttp);
var mails = require('server/config/mails')

function MailStub (options) {
  this.options = options || {}
  this.name = 'MailStub'
}

MailStub.prototype.send = function (mail, cb) {
  if (this.options.customCallback) {
    this.options.customCallback(mail)
  }
  cb(null)
}

var server = require('server/app')()
// var superagent = require('superagent');
var agent = request.agent(server);

console.log(agent)
// var server = request.agent('http://localhost:3000')
describe('CommandPublicControllers', function () {
  var idUserTemp = ''
  var lastMail = {}

  beforeEach(function (doneFirst) {
     mockgoose.reset()

    mails.init(new MailStub({
      customCallback: function (mail) {
        lastMail = mail
      }
    }), {
      statics: {baseuri: 'http://localhost/'}
    })

    doneFirst()
  })

  describe('Functionalidades de CommandPublicControllers', function () {
    it('crear usuario', function (doneFirst) {
      request(server)
        .post('/api/users')
        .send({
          'username': 'debian789y',
          'email': 'debian789y@gmail.com',
          'password': '123456789'
        })
        .expect(200)
        .end(function (err, res) {
          expect(err).to.be.null
          expect(res.body).to.have.property('_id')
          expect(res.body).to.have.property('username', 'debian789y')
          expect(res.body).to.have.property('email', 'debian789y@gmail.com')
          idUserTemp = res.body._id
          // return doneFirst()

          chai.request(server)
            .post('/api/sessions')
            .send({
              "email": "debian789@gmail.com",
              "password": "123456789"
            })
            .end(function(err, res2) {
              console.log('----dddddd--------')
              //console.log(err)
              console.log(res2.body)
              console.log('---ddddddd---------')
              expect(res2.body.token)
              var data = jwt.decode(res2.body.token, 'xxx')
              expect(data).to.have.property('username', 'debian789')
              expect(data).to.have.property('iat')
              expect(data).to.have.property('exp')
              expect(data.exp - data.iat).to.equal(43200)
              return doneFirst()
            })
         })
    })

    it('Crear un comando y obtenerlo', function (doneOne) {
      async.series([
        // query all return empty data []
        function (callback) {
          request(server)
          .get('/api/command-public/all')
          .expect('Content-Type', /json/)
          .expect(200)
          .expect({
            data: [],
            actualPage: 0,
            pages: 0,
            countData: 0,
            limitByPage: 10
          })
          .end(function (err, res) {
            return err ? doneOne(err) : callback()
          })
        }, function (callback) {
          // create command one
          request(server)
          .post('/api/command-private/command')
          .send({'title': 'hola mundo', 'description': 'is command', 'user': idUserTemp})
          .expect(201)
          .end(function (err, res) {
            console.log('--------------------')
            console.log(res.body)

            expect(res.body).to.have.property('title', 'hola mundo')
            expect(res.body).to.have.property('description', 'is command')
            expect(res.body).to.have.property('is_edit', false)
            expect(res.body).to.have.property('is_public', false)
            expect(res.body).to.have.property('itemsCommand')
            return err ? doneOne(err) : callback()
          })
        }, function (callback) {
          // create command two
          request(server)
          .post('/api/command-private/command')
          .send({
            'title': 'Hello world !',
            'user': idUserTemp,
            'is_edit': true,
            'is_public': true
          })
          .expect(201)
          .end(function (err, res) {
            expect(res.body).to.have.property('title', 'Hello world !')
            expect(res.body).to.have.property('is_edit', true)
            expect(res.body).to.have.property('is_public', true)
            expect(res.body).to.have.property('itemsCommand')
            return err ? doneOne(err) : callback()
          })
        }, function (callback) {
          // create command three
          request(server)
          .post('/api/command-private/command')
          .send({
            'title': 'Files linux',
            'user': idUserTemp,
            'is_edit': true,
            'is_public': true,
            'itemsCommand': [{
              command: 'ls -la',
              description: 'View files and directory'
            }, {
              command: 'mkdir name',
              description: 'Create directory'
            }
            ]
          })
          .expect(201)
          .end(function (err, res) {
            expect(res.body).to.have.property('title', 'Files linux')
            expect(res.body).to.have.property('is_edit', true)
            expect(res.body).to.have.property('is_public', true)
            expect(res.body).to.have.property('itemsCommand')
            expect(res.body.itemsCommand).to.have.length(2)
            return err ? doneOne(err) : callback()
          })
        }, function (callback) {
          // query all command
          request(server)
          .get('/api/command-public/all')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body.data).to.have.length(3)
            expect(res.body.data[0]).to.have.property('title', 'hola mundo')
            expect(res.body.data[0]).to.have.property('is_edit', false)
            expect(res.body.data[1]).to.have.property('title', 'Hello world !')
            expect(res.body.data[1]).to.have.property('is_edit', true)
            return err ? doneOne(err) : callback()
          })
        }, function (callback) {
            // query  command limit 1
          request(server)
            .get('/api/command-public/all?limit=1')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.data).to.have.length(1)
              expect(res.body.data[0]).to.have.property('title', 'hola mundo')
              return err ? doneOne(err) : callback()
            })
        }, function (callback) {
            // query command search
          request(server)
            .get('/api/command-public/all?search=world')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body.data).to.have.length(1)
              expect(res.body.data[0]).to.have.property('title', 'Hello world !')
              return err ? doneOne(err) : callback()
            })
        }, function (callback) {
        // query command search
          request(server)
          .get('/api/command-public/all?search=l&page=1&limit=1')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body.data).to.have.length(1)
            expect(res.body.data[0]).to.have.property('title', 'Hello world !')
            doneOne()
          })
        }
      ])
    })

    it('Should get command by id', function (doneOne) {
      var idCommand = ''

      async.series([
        function (callback) {
            // Create command
          request(server)
            .post('/api/command-private/command')
            .send({'title': 'hola', 'user': idUserTemp})
            .expect(201)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res.body).to.have.property('title')
              return err ? doneOne(err) : callback()
            })
        }, function (callback) {
            // get command
          request(server)
            .get('/api/command-public/all')
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              idCommand = res.body.data[0]
              return err ? doneOne(err) : callback()
            })
        }, function (callback) {
          request(server)
            .get('/api/command-public/command/' + idCommand._id)
            .expect(200)
            .end(function (err, res) {
              expect(err).to.be.null
              doneOne()
            })
        }
      ])
    })

    it('Should edit to command by id', function (doneOne) {
      var idCommand = ''
      async.series([ function (callback) {
        // Create Command
        request(server)
          .post('/api/command-private/command')
          .send({'title': 'hola', 'user': idUserTemp})
          .expect(201)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.have.property('title')
            idCommand = res.body._id
            return err ? doneOne(err) : callback()
          })
      }, function (callback) {
        // Edit Command
        request(server)
          .put('/api/command-private/command/' + idCommand)
          .send({'title': 'ls', 'itemsCommand': {'command': 'mkdir'}})
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.have.property('_id')
            return err ? doneOne(err) : callback()
          })
      }, function (callback) {
        // Query by id
        request(server)
          .get('/api/command-public/command/' + idCommand)
          .expect(200)
          .end(function (err, res) {
            expect(err).to.be.null
            expect(res.body).to.have.property('title', 'ls')
            expect(res.body).to.have.property('itemsCommand')
            expect(res.body.itemsCommand).to.have.instanceof(Array)
            doneOne()
          })
      }])
    })
  })
})
