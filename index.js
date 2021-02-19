const express = require('express');
const app = express();

/* Import config */
const config = require('./src/config');

/* Choose a port for start a server */
const port = process.env.PORT || 80;

/* Import express addons */
const bodyParser = require('body-parser');
const cors = require('cors');

/* Import crypto modules */
const qs = require('querystring');
const crypto = require('crypto');

/* Import user model */
const { User } = require('./src/mongo');

/* Import rewards array */
const rewards = require('./src/rewards');

/* Import VK Coin API */
const coin = require('./src/coinApi');

/* Use express addons */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get('*', async (req, res) => {
    return res.send('Oops.. You\'re busted! ^_^\nPlease, leave from this page.');
});

app.post('/getUserInformation', async (req, res) => {

    if (!req.body.sign) {
        return res.send('Bad request data');
    }

    const urlParams = qs.parse(req.body.sign.replace(/(?:\?)/g, ''));
    const ordered = {};

    Object.keys(urlParams).sort().forEach((key) => {
        if (key.slice(0, 3) === 'vk_') {
            ordered[key] = urlParams[key];
        }
    });
    
    const stringParams = qs.stringify(ordered);
    const paramsHash = crypto
    .createHmac('sha256', config.secretKey)
    .update(stringParams)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

    if (paramsHash !== urlParams.sign) {
        return res.send('Invalid request data');
    }

    const user = Number(ordered.vk_user_id);

    const result = await User.find({ user_id: user });
    const data = result[0];

    if (!data) {

        const newUser = new User({
            user_id: user,
            viewed: 0,
            next: 0,
            refferer: null,
            refEarned: 0
        });

        return newUser.save((error) => {

            if (error) {
                return res.statusCode(500).send('Internal Server Error');
            }

            return res.send({
                viewed: 0,
                left: 100,
                earnedByRef: 0
            });

        });

    }

    const currentReward = rewards.findIndex(element => element.reward <= data.viewed) + 1;
    const left = rewards[currentReward + 1].views - data.viewed;

    return res.send({
        viewed: data.viewed,
        left: left,
        earnedByRef: data.refEarned
    });

});

app.post('/viewAd', async (req, res) => {

    if (!req.body.sign || !req.body.key) {
        return res.send('Bad request data');
    }

    req.body.key = req.body.key.split('-');

    if (req.body.key[0].length < 32 || Number(req.body.key[1]) < 0 || Number(req.body.key[2]) < Date.now() - 86400000) {
        return res.send('Bad request key');
    }

    const urlParams = qs.parse(req.body.sign.replace(/(?:\?)/g, ''));
    const ordered = {};

    Object.keys(urlParams).sort().forEach((key) => {
        if (key.slice(0, 3) === 'vk_') {
            ordered[key] = urlParams[key];
        }
    });
    
    const stringParams = qs.stringify(ordered);
    const paramsHash = crypto
    .createHmac('sha256', config.secretKey)
    .update(stringParams)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

    if (paramsHash !== urlParams.sign) {
        return res.send('Invalid request data');
    }

    const user = Number(ordered.vk_user_id);

    const result = await User.find({ user_id: user });
    const data = result[0];

    if (!data) {

        const newUser = new User({
            user_id: user,
            viewed: 0,
            next: 0,
            refferer: null,
            refEarned: 0
        });

        return newUser.save((error) => {
            if (error) {
                return res.statusCode(500).send('Internal Server Error');
            }
        });

    }

    if (data.next > Date.now()) {
        return res.send('Wait 3 seconds');
    }

    const currentRewardIndex = rewards.findIndex(element => element.reward <= data.viewed) + 1;
    const currentReward = rewards[currentRewardIndex].reward;

    await coin.api.sendPayment(user, currentReward * 1000, false);

    data.viewed += 1;
    data.next = Date.now() + 3000;

    const refResult = await User.find({ user_id: data.refferer });
    const refData = refResult[0];

    if (refData) {

        const reffererReward = currentReward >= 1000 ? 1000 : currentReward;
        refData.refEarned += reffererReward;

        await coin.api.sendPayment(data.refferer, reffererReward * 1000, false);
        await refData.save();

    }

    return data.save((error) => {

        if (error) {
            return res.statusCode(500).send('Internal Server Error');
        }

        return res.send({
            response: true
        });

    });

});

app.post('/badAd', async (req, res) => {

    if (!req.body.sign || !req.body.key) {
        return res.send('Bad request data');
    }

    req.body.key = req.body.key.split('-');

    if (req.body.key[0].length < 32 || Number(req.body.key[1]) < 0 || Number(req.body.key[2]) < Date.now() - 86400000) {
        return res.send('Bad request key');
    }

    const urlParams = qs.parse(req.body.sign.replace(/(?:\?)/g, ''));
    const ordered = {};

    Object.keys(urlParams).sort().forEach((key) => {
        if (key.slice(0, 3) === 'vk_') {
            ordered[key] = urlParams[key];
        }
    });
    
    const stringParams = qs.stringify(ordered);
    const paramsHash = crypto
    .createHmac('sha256', config.secretKey)
    .update(stringParams)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

    if (paramsHash !== urlParams.sign) {
        return res.send('Invalid request data');
    }

    const user = Number(ordered.vk_user_id);

    const result = await User.find({ user_id: user });
    const data = result[0];

    if (!data) {

        const newUser = new User({
            user_id: user,
            viewed: 0,
            next: 0,
            refferer: null,
            refEarned: 0
        });

        return newUser.save((error) => {
            if (error) {
                return res.statusCode(500).send('Internal Server Error');
            }
        });

    }

    if (data.next > Date.now()) {
        return res.send('Wait 3 seconds');
    }

    const currentReward = 10;

    await coin.api.sendPayment(user, currentReward * 1000, false);

    data.viewed += 1;
    data.next = Date.now() + 3000;

    const refResult = await User.find({ user_id: data.refferer });
    const refData = refResult[0];

    if (refData) {

        const reffererReward = 10;
        refData.refEarned += reffererReward;

        await coin.api.sendPayment(data.refferer, reffererReward * 1000, false);
        await refData.save();

    }

    return data.save((error) => {

        if (error) {
            return res.statusCode(500).send('Internal Server Error');
        }

        return res.send({
            response: true
        });

    });

});

app.post('/joinRefferal', async (req, res) => {

    if (!req.body.sign || !req.body.user) {
        return res.send('Bad request data');
    }

    const urlParams = qs.parse(req.body.sign.replace(/(?:\?)/g, ''));
    const ordered = {};

    Object.keys(urlParams).sort().forEach((key) => {
        if (key.slice(0, 3) === 'vk_') {
            ordered[key] = urlParams[key];
        }
    });
    
    const stringParams = qs.stringify(ordered);
    const paramsHash = crypto
    .createHmac('sha256', config.secretKey)
    .update(stringParams)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

    if (paramsHash !== urlParams.sign) {
        return res.send('Invalid request data');
    }

    const user = Number(ordered.vk_user_id);

    const result = await User.find({ user_id: user });
    const data = result[0];

    if (!data || data.refferer || req.body.user === user || Number(req.body.user) < 1) {
        return res.send('Invalid request data');
    }

    data.refferer = req.body.user;

    return data.save((error) => {

        if (error) {
            return res.statusCode(500).send('Internal Server Error');
        }

        return res.send({
            response: true
        });

    });

});

app.post('*', async (req, res) => {
    return res.send('Bad request route');
});

/* Start */
app.listen(port, () => console.log(`Started at port ${port}`));