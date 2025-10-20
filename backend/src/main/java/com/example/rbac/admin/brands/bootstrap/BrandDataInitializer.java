package com.example.rbac.admin.brands.bootstrap;

import com.example.rbac.admin.brands.model.Brand;
import com.example.rbac.admin.brands.repository.BrandRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class BrandDataInitializer implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(BrandDataInitializer.class);

    private final BrandRepository brandRepository;

    public BrandDataInitializer(BrandRepository brandRepository) {
        this.brandRepository = brandRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedBrands();
    }

    private void seedBrands() {
        List<BrandSeed> seeds = List.of(
                new BrandSeed("Apple", "apple", "Premium electronics designed in California.", "https://logo.clearbit.com/apple.com"),
                new BrandSeed("Samsung", "samsung", "Global leader in smart devices and appliances.", "https://logo.clearbit.com/samsung.com"),
                new BrandSeed("Sony", "sony", "Immersive entertainment and imaging technology.", "https://logo.clearbit.com/sony.com"),
                new BrandSeed("LG", "lg", "Innovative home electronics and appliances.", "https://logo.clearbit.com/lg.com"),
                new BrandSeed("Huawei", "huawei", "Cutting-edge mobile and networking solutions.", "https://logo.clearbit.com/huawei.com"),
                new BrandSeed("Xiaomi", "xiaomi", "Smart devices designed for every lifestyle.", "https://logo.clearbit.com/mi.com"),
                new BrandSeed("OnePlus", "oneplus", "Flagship smartphones with refined design.", "https://logo.clearbit.com/oneplus.com"),
                new BrandSeed("Google", "google", "Helpful tech crafted by the Google hardware team.", "https://logo.clearbit.com/google.com"),
                new BrandSeed("Microsoft", "microsoft", "Devices empowering productivity and play.", "https://logo.clearbit.com/microsoft.com"),
                new BrandSeed("Dell", "dell", "Performance computers for creators and pros.", "https://logo.clearbit.com/dell.com"),
                new BrandSeed("HP", "hp", "Trusted PCs and printers for home and office.", "https://logo.clearbit.com/hp.com"),
                new BrandSeed("Lenovo", "lenovo", "Versatile technology for modern living.", "https://logo.clearbit.com/lenovo.com"),
                new BrandSeed("Asus", "asus", "Gaming and creator hardware engineered to perform.", "https://logo.clearbit.com/asus.com"),
                new BrandSeed("Acer", "acer", "Laptops and monitors for work and play.", "https://logo.clearbit.com/acer.com"),
                new BrandSeed("Razer", "razer", "High-performance gear for gamers worldwide.", "https://logo.clearbit.com/razer.com"),
                new BrandSeed("Bose", "bose", "Premium audio tuned for pure immersion.", "https://logo.clearbit.com/bose.com"),
                new BrandSeed("JBL", "jbl", "Bold sound that travels everywhere with you.", "https://logo.clearbit.com/jbl.com"),
                new BrandSeed("Beats", "beats", "Culture-driven sound backed by Apple innovation.", "https://logo.clearbit.com/beatsbydre.com"),
                new BrandSeed("Nike", "nike", "Athletic essentials engineered for performance.", "https://logo.clearbit.com/nike.com"),
                new BrandSeed("Adidas", "adidas", "Sport style that moves with you.", "https://logo.clearbit.com/adidas.com"),
                new BrandSeed("Puma", "puma", "Street-ready sportwear with bold energy.", "https://logo.clearbit.com/puma.com"),
                new BrandSeed("Reebok", "reebok", "Fitness classics reimagined for today.", "https://logo.clearbit.com/reebok.com"),
                new BrandSeed("Under Armour", "under-armour", "Performance apparel built to make you better.", "https://logo.clearbit.com/underarmour.com"),
                new BrandSeed("New Balance", "new-balance", "Heritage sneakers with modern comfort.", "https://logo.clearbit.com/newbalance.com"),
                new BrandSeed("Patagonia", "patagonia", "Responsible gear for outdoor pursuits.", "https://logo.clearbit.com/patagonia.com"),
                new BrandSeed("The North Face", "the-north-face", "Expedition-grade apparel and equipment.", "https://logo.clearbit.com/thenorthface.com"),
                new BrandSeed("Columbia", "columbia", "Outdoor staples inspired by the Pacific Northwest.", "https://logo.clearbit.com/columbia.com"),
                new BrandSeed("H&M", "h-and-m", "Fashion basics at refresh-friendly prices.", "https://logo.clearbit.com/hm.com"),
                new BrandSeed("Zara", "zara", "Runway-inspired looks for every day.", "https://logo.clearbit.com/zara.com"),
                new BrandSeed("Uniqlo", "uniqlo", "LifeWear essentials blending form and function.", "https://logo.clearbit.com/uniqlo.com"),
                new BrandSeed("Gap", "gap", "American casualwear with timeless appeal.", "https://logo.clearbit.com/gap.com"),
                new BrandSeed("Levi's", "levis", "Iconic denim crafted for durability.", "https://logo.clearbit.com/levis.com"),
                new BrandSeed("Gucci", "gucci", "Italian luxury with modern glamour.", "https://logo.clearbit.com/gucci.com"),
                new BrandSeed("Prada", "prada", "Avant-garde fashion handcrafted in Italy.", "https://logo.clearbit.com/prada.com"),
                new BrandSeed("Hermes", "hermes", "Parisian artisanship and timeless design.", "https://logo.clearbit.com/hermes.com"),
                new BrandSeed("Chanel", "chanel", "Elegance defined through couture heritage.", "https://logo.clearbit.com/chanel.com"),
                new BrandSeed("Dior", "dior", "Iconic silhouettes with haute couture roots.", "https://logo.clearbit.com/dior.com"),
                new BrandSeed("Rolex", "rolex", "Swiss precision with enduring prestige.", "https://logo.clearbit.com/rolex.com"),
                new BrandSeed("Fossil", "fossil", "Vintage-inspired watches and accessories.", "https://logo.clearbit.com/fossil.com"),
                new BrandSeed("Casio", "casio", "Everyday tech and timepieces built to last.", "https://logo.clearbit.com/casio.com"),
                new BrandSeed("Seiko", "seiko", "Japanese watchmaking with timeless craftsmanship.", "https://logo.clearbit.com/seikowatches.com"),
                new BrandSeed("Garmin", "garmin", "GPS-enabled wearables for active lifestyles.", "https://logo.clearbit.com/garmin.com"),
                new BrandSeed("Fitbit", "fitbit", "Health insights that keep you moving.", "https://logo.clearbit.com/fitbit.com"),
                new BrandSeed("GoPro", "gopro", "Action cameras capturing every adventure.", "https://logo.clearbit.com/gopro.com"),
                new BrandSeed("DJI", "dji", "Leading drones and camera stabilizers.", "https://logo.clearbit.com/dji.com"),
                new BrandSeed("Canon", "canon", "Imaging systems trusted by professionals.", "https://logo.clearbit.com/canon.com"),
                new BrandSeed("Nikon", "nikon", "Optics crafted for storytellers.", "https://logo.clearbit.com/nikon.com"),
                new BrandSeed("Fujifilm", "fujifilm", "Film heritage meets mirrorless innovation.", "https://logo.clearbit.com/fujifilm.com"),
                new BrandSeed("Panasonic", "panasonic", "Smart living electronics from Japan.", "https://logo.clearbit.com/panasonic.com"),
                new BrandSeed("Philips", "philips", "Connected health and home technology.", "https://logo.clearbit.com/philips.com")
        );

        for (BrandSeed seed : seeds) {
            if (brandRepository.existsBySlugIgnoreCase(seed.slug())) {
                continue;
            }
            Brand brand = new Brand();
            brand.setName(seed.name());
            brand.setSlug(seed.slug());
            brand.setDescription(seed.description());
            brand.setLogoUrl(seed.logoUrl());
            brandRepository.save(brand);
            LOGGER.debug("Seeded brand {}", seed.name());
        }
    }

    private record BrandSeed(String name, String slug, String description, String logoUrl) {
    }
}
