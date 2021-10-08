const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || '80';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
    res.render(
        'index',
        {
            title: 'Coming Soon!',
        }
    );
});

app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});