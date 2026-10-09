import HeroSlider from "@/components/ui/Application/website/Bigbanner";
import ShowCategoryList from "@/components/ui/Application/website/ShowCategoryList";
import WhyChooseUs from "@/components/ui/Application/website/banner2";
import MostLovedMenu from "@/components/ui/Application/website/FeatureOrder";
import {
  QuickCategories,
  TodaysSpecial,
  OffersSection,
  ReviewsSection,
  DeliveryVisit,
} from "@/components/ui/Application/website/SfgSections";

export const metadata = {
  title: "Shawon Food Gate | Halal Biryani, Grill, Döner & Breakfast in Forest Gate",
  description:
    "Order online from Shawon Food Gate, 179 Forest Ln, London E7 9BB. 100% halal biryani, peri peri, döner kebab, curries, English breakfast, fresh naan and karak chai. Delivery & collection, open 7 days 8AM–12AM.",
};

const Home = () => {
  return (
    <div className="bg-[#0A1806]">
      {/* Hero slider — special offers / best sellers */}
      <HeroSlider />

      {/* Categories quick links */}
      <QuickCategories />

      {/* Today's special */}
      <TodaysSpecial />

      {/* Popular items (products ticked "Most Loved" in admin) */}
      <section id="Order-now" className="scroll-mt-28">
        <MostLovedMenu />
      </section>

      {/* Full menu — categories from admin */}
      <ShowCategoryList eyebrow="Explore our kitchen" title="Our" accent="Menu" showCartButton={false} />

      <ShowCategoryList
        listing="special"
        sectionId="bangladeshi-special"
        eyebrow="Extra special on the menu"
        title="Taste of"
        accent="Bangladesh"
        showCartButton={false}
        hideWhenEmpty
      />

      {/* Offers & discounts */}
      <OffersSection />

      {/* About / why us */}
      <WhyChooseUs />

      {/* Customer reviews */}
      <ReviewsSection />

      {/* Delivery areas, opening hours, location + map */}
      <DeliveryVisit />
    </div>
  );
};

export default Home;
