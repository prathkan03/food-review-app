import logging

from playwright.async_api import async_playwright

from app.config import settings

logger = logging.getLogger(__name__)


async def scrape_menu_page(website_url: str) -> str | None:
    """Use Playwright to scrape text content from a restaurant's website/menu page."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            logger.info(f"Navigating to: {website_url}")

            # First, check if the URL already points to a menu page
            url_lower = website_url.lower()
            menu_path_keywords = [
                "/menu", "/food", "/our-menu", "/our-food", "/food-menu",
                "/dining", "/eat", "/drinks", "/beverages", "/bar",
                "/cuisine", "/order", "/drink-menu", "/bar-menu",
                "/lunch", "/dinner", "/breakfast", "/brunch",
                "/specials", "/daily-specials", "/menus",
            ]
            is_menu_url = any(kw in url_lower for kw in menu_path_keywords)

            await page.goto(website_url, wait_until="networkidle",
                            timeout=settings.scrape_timeout_ms)

            # If not already on a menu page, try to find and click a menu link
            if not is_menu_url:
                menu_link = await page.query_selector(
                    'a[href*="menu" i], a[href*="/food" i], a[href*="/dining" i], '
                    'a[href*="/eat" i], a[href*="/drinks" i], a[href*="/bar" i], '
                    'a[href*="/order" i], a[href*="/cuisine" i], a[href*="/lunch" i], '
                    'a[href*="/dinner" i], a[href*="/breakfast" i], a[href*="/brunch" i], '
                    'a[href*="/specials" i], a[href*="/beverages" i], '
                    'a:has-text("Menu"), a:has-text("Our Menu"), a:has-text("Food"), '
                    'a:has-text("Dining"), a:has-text("Order")'
                )
                if menu_link:
                    href = await menu_link.get_attribute("href")
                    if href and not href.startswith("javascript"):
                        menu_url = href if href.startswith("http") else f"{website_url.rstrip('/')}/{href.lstrip('/')}"
                        logger.info(f"Found menu link, navigating to: {menu_url}")
                        await page.goto(menu_url, wait_until="networkidle",
                                        timeout=settings.scrape_timeout_ms)

            # Wait for JS-rendered content (SPAs like sweetgreen)
            await page.wait_for_timeout(3000)

            # Try scrolling to trigger lazy-loaded content
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1500)

            # Extract visible text content
            text = await page.evaluate("""
                () => {
                    const sel = document.querySelectorAll(
                        'main, [role="main"], .menu, #menu, [class*="menu"], '
                        + '[class*="Menu"], article, .content, [class*="product"], '
                        + '[class*="dish"], [class*="item"], body'
                    );
                    const el = sel.length > 0 ? sel[0] : document.body;
                    return el.innerText;
                }
            """)

            logger.info(f"Scraped {len(text or '')} chars from {page.url}")

            # Truncate to avoid overly large payloads to Claude
            return text[:15000] if text else None
        finally:
            await browser.close()
