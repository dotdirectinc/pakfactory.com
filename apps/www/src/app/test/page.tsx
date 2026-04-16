import Navbar from '@/components/common/navbar'

const navigationData = [
  {
    title: 'Home',
    href: '#'
  },
  {
    title: 'Products',
    href: '#'
  },
  {
    title: 'About Us',
    href: '#'
  },
  {
    title: 'Contacts',
    href: '#'
  }
]

const NavbarPage = () => {
  return (
    <div className='h-70'>
      <Navbar navigationData={navigationData} />
    </div>
  )
}

export default NavbarPage
