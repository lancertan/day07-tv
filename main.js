//load libraries
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

//configure the PORT
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

//configure connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'leisure',
    connectionLimit: 4,
    timezone: '+08:00'
})

//SQL
const SQL_GET_SHOWS = 'select tvid, name from tv_shows order by name desc limit 20'
const SQL_GET_SHOW_BY_SHOWID = 'select * from tv_shows where tvid like ?'
//create express
const app = express()

//configure handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

//application
app.get('/', async (req, resp) => {
    
    const conn = await pool.getConnection()
    
    try {
        const results = await conn.query(SQL_GET_SHOWS, 20)

        resp.status(200)
        resp.type('text/html')
        resp.render('index', {shows: results[0] })

    } catch (e) {
        resp.status(500)
        resp.type('text/html')
        resp.render(JSON.stringify(e))

    } finally {
        conn.release()
    }
})

app.get('/shows/:showId', async (req, resp) => {
    const showId = req.params['showId']

    const conn = await pool.getConnection()

    try{
        const results = await conn.query(SQL_GET_SHOW_BY_SHOWID, [showId])
        const recs = results[0]

        if(recs.length <=0) {
            //404
            resp.status(404)
            resp.type('text/html')
            resp.send(`Not found: ${showId}`)
            return
        }

        resp.status(200)
        resp.render('details', { show: recs[0]})
        
    } catch (e) {
        resp.status(500)
        resp.type('tetx/html')
        resp.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
})


//start server

pool.getConnection()
    .then(conn => {
        console.info('Pinging database...')
        const p0 = Promise.resolve(conn)
        const p1 = conn.ping()
        return Promise.all([ p0 , p1 ])
    })
    .then(results => {
        const conn = results[0]
        //release the connection
        conn.release()

        //start the server
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    })
    .catch(e => {
        console.error('Cannot start server: ', e)
    })
