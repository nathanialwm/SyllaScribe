import App from './App.jsx'
import Home from './home.jsx'


function Choice({user}) {
   return user ? <Home user={user} /> : <App />;
}

export default Choice;