const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repository/userRepository');

const SALT_ROUNDS = 10;

const registerUser = async (userData) => {
  const { first_name, last_name, username, password } = userData;

  const existingUser = await userRepository.findUserByUsername(username);
  if (existingUser) {
    const err = new Error('Username already exists.');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser = await userRepository.createUser({
    first_name,
    last_name,
    username,
    hashedPassword,
  });

  return { success: true, message: 'User registered successfully.', user: newUser };
};

const loginUser = async (username, password) => {
  const user = await userRepository.findUserByUsername(username);
  if (!user) {
    const err = new Error('Usuario o clave inválida.');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Usuario o clave inválida.');
    err.statusCode = 401;
    throw err;
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in .env file');
    const err = new Error('Server configuration error.');
    err.statusCode = 500;
    throw err;
  }

  const jwtPayload = {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
  };

  const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

  return { success: true, message: 'Login successful.', token };
};

const getEnrollments = async (userId) => {
    return await userRepository.getUserEnrollments(userId);
}

module.exports = {
  registerUser,
  loginUser,
  getEnrollments,
};
