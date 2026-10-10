// Importing every model registers its schema with mongoose. connectDB()
// loads this so populate() never fails with "Schema hasn't been registered
// for model X" when a route happens to be the first one hit on a fresh
// server (common on Vercel, where each instance starts cold).
import "@/models/User.model";
import "@/models/Media.model";
import "@/models/category.model";
import "@/models/subcategory.model";
import "@/models/Product.model";
import "@/models/Order.model";
import "@/models/OrderTrack.model";
import "@/models/Coupon.model";
import "@/models/Banner.model";
import "@/models/Counter.model";
import "@/models/RestaurantSettings.model";
import "@/models/FbTrackingSetting.model";
import "@/models/Ingredient.model";
import "@/models/Recipe.model";
import "@/models/Supplier.model";
import "@/models/PurchaseOrder.model";
import "@/models/StockLocation.model";
import "@/models/StockMovement.model";
import "@/models/StockCount.model";
import "@/models/StaffSalary.model";
import "@/models/wishlist.model";
import "@/models/Otp.model";
import "@/models/Expense.model";
import "@/models/Message.model";
