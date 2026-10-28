if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.fabricBannerRedirecting) return;
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then(async (response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            }

            const editKey = this.form.dataset.fbEditKey;
            if (editKey && this.closest('.fb-product-form')) {
              const addedResponse = response;
              try {
                if (!addedResponse.key) throw new Error('Shopify did not return the edited cart line key.');
                let startingQuantities = {};
                try {
                  startingQuantities = JSON.parse(this.form.dataset.fbEditCartQuantities || '{}');
                } catch (error) {
                  startingQuantities = {};
                }
                const addedKey = String(addedResponse.key);
                const updateBody = new URLSearchParams();
                const requestedQuantity = Number(formData.get('quantity')) || 1;
                const targetQuantity = addedKey === editKey
                  ? requestedQuantity
                  : (Number(startingQuantities[addedKey]) || 0) + requestedQuantity;
                updateBody.set(`updates[${addedKey}]`, String(targetQuantity));
                if (addedKey !== editKey) updateBody.set(`updates[${editKey}]`, '0');
                if (this.cart) {
                  updateBody.set('sections', this.cart.getSectionsToRender().map((section) => section.id).join(','));
                  updateBody.set('sections_url', window.location.pathname);
                }
                const updateResponse = await fetch(routes.cart_update_url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  body: updateBody.toString(),
                });
                const updatedCart = await updateResponse.json();
                if (!updateResponse.ok || updatedCart.status) throw new Error(updatedCart.description || 'Could not replace the previous cart line.');
                updatedCart.id = addedResponse.id;
                response = updatedCart;
                delete this.form.dataset.fbEditKey;
                delete this.form.dataset.fbEditCartQuantities;
              } catch (error) {
                console.error('Fabric Banner edit could not replace the original cart line.', error);
                this.handleErrorMessage('The new configuration was added, but the previous cart line could not be replaced. Please review your cart.');
                this.error = true;
                if (this.cart) this.cart.renderContents(addedResponse);
                else window.location = window.routes.cart_url;
                return;
              }
            }

            if (this.closest('.fb-product-form')) {
              const cartUrl = window.routes.cart_url;
              const separator = cartUrl.includes('?') ? '&' : '?';
              this.fabricBannerRedirecting = true;
              window.location.assign(`${cartUrl}${separator}${editKey ? 'fb_updated=1' : 'fb_added=1'}`);
              return;
            }

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error && !this.fabricBannerRedirecting) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
