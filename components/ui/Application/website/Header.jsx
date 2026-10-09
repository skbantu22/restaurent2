import React from 'react'
import Navbar from './Navbar'

// Navbar already renders its own sticky, full-opacity header — this
// used to wrap it in a second sticky/no-background div, which added a
// duplicate stacking layer with nothing painted on it.
const Header = () => {
  return <Navbar />
}

export default Header
