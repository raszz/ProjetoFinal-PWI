const {user: userModel, user} = require('../models/User');
const db = require('../db/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Making random marker
async function getMarker(){
    marker = Math.floor(Math.random() * 10000000000);
    const markerExists = await userModel.findOne({marker: marker});
    if(markerExists){
        getMarker();
    }
    return marker;
}

// Função de criar user
async function create (req, res){
    
    const {name, username, email, password} = req.body

    const emailExists = await userModel.findOne({email : email})
    const userExists = await userModel.findOne({username: username})

    if(emailExists){
        return res.status(422).json('email já cadastrado, tente com outro email!')
    }
    if(userExists){
        return res.status(422).json('usuário já existe, tente outro usuário')
    }

    getMarker();

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    try{
        new userModel({
            name,
            username,
            email,
            password: passwordHash,
            marker: marker,
        }).save().then(res.redirect('/signin'));
    } catch(error){
        console.log('Erro ao criar usuário:' + error);
    }
};

async function signin (req, res){

    const {username, password} = req.body

    const user = await userModel.findOne({username: username})
    if(!user){
        return res.status(422).json('usuário não encontrado!')
    } 

    const checkPassword = await bcrypt.compare(password, user.password)
    if(!checkPassword){
        return res.status(422).json('Senha inválida!')
    }

    try{
        const secret = process.env.SECRET
        const token = jwt.sign({
            id: user._id,
            expiresIn: 3600
        },
        secret,
    )   
        const tokenBearer = `Bearer ${token}`;

        req.session.user = user;

        res.cookie('access_token', tokenBearer, { maxAge: 3600000 }); // 1h
        res.set('Authorization', tokenBearer);
        res.redirect('/');
        //res.status(200).json('Autenticação realizada com sucesso! '+ token)
    } catch(error){
        res.status(422).json('autenticacao n funcionou')
    }
}

async function signout(req, res){
    req.session.destroy();
   
    res.clearCookie('access_token');
    res.redirect('/');
};

async function isAuthenticated (req, res, next){
    const { access_token } = req.cookies;
    const msg = 'Você precisa se autenticar para acessar essa página.';
    if (access_token) {
        try {
        const [, token] = access_token.split(' ');
        await jwt.verify(token, process.env.SECRET);
  
        return next();
      } catch (e) {
        req.session.user = null; // session's over
        //req.flash('info', msg);
        return res.redirect('/signin');
      }
    } else {
      req.session.user = null; // session's over
      //req.flash('info', msg);
      return res.redirect('/signin');
    }
};
module.exports = {create, signin, signout, isAuthenticated}