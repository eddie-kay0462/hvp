export const Footer = () => {
  return (
    <footer className="bg-accent text-accent-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Hustle Village</h3>
            <p className="text-sm opacity-90">
              Your campus marketplace for services and skills
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">For Buyers</h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Browse Services</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">How to Book</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Safety Tips</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">For Sellers</h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Start Selling</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Seller Guidelines</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Success Stories</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li><a href="#" className="hover:opacity-100 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contact</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-accent-foreground/20 mt-8 pt-8 text-center text-sm opacity-90">
          <p>&copy; 2024 Hustle Village. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
