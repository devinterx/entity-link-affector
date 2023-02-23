// CONFIG.debug.hooks = false;

const _acceptedTypes = {
    "default": ["weapon", "equipment", "consumable", "tool", "loot", "background", "class", "subclass", "spell", "feat", "backpack"],
    "pf2e":    ["action", "affliction", "ancestry", "armor", "backpack", "book", "equipment", "class", "condition", "consumable", "background",
                "deity", "effect", "feat", "heritage", "kit", "lore", "melee", "spell", "spellcastingEntry", "treasure", "weapon"]
};

const _htmlClosest = (child, selectors) => !(child instanceof Element) ? null : child.closest(selectors);
const _onClickContentLink = async (wrapped, event) => {
  if (!(event.shiftKey || event.altKey)) return wrapped(event);
  
  event.preventDefault();
  const doc = await fromUuid(event.currentTarget.dataset.uuid);
  const acceptedTypes = _acceptedTypes[(CONFIG.PF2E ? 'pf2e' : 'default')];
  if (!doc?.type || acceptedTypes.indexOf(doc?.type || 'undefined') === -1) return wrapped(event);

  const target = event.currentTarget;
  let itemSource = doc.toObject();

  if (CONFIG.PF2E) {
    if (target.classList.contains('content-link')) {
      if (itemSource.type === 'effect' || itemSource.type === 'affliction' || itemSource.type === 'condition') {
        // Detect condition count if available
        const name = target.innerText.trim();
        const match = name.match(/[0-9]+/);
        if (match && itemSource.system?.value && itemSource.system?.value?.isValued)
          itemSource.system.value.value = Number(match[0]);

        // Detect spell level of containing element, if available
        const containerElement = _htmlClosest(target, '[data-cast-level]');
        const castLevel = Number(containerElement?.dataset.castLevel);
        if (castLevel > 0 && itemSource.system?.level)
          itemSource.system.level.value = castLevel;

        const messageId = _htmlClosest(target, 'li.chat-message')?.dataset.messageId;
        const message = game.messages.get(messageId ?? '');
        if (message?.actor) {
          const {actor, token, target} = message;
          const roll = message.rolls.at(-1);

          itemSource.system.context = {
            origin: {
              actor: actor.uuid,
              token: token?.uuid ?? null,
              item: message.item?.uuid ?? null,
            },
            target: target ? {actor: target.actor.uuid, token: target.token.uuid} : null,
            roll: roll
              ? {
                total: roll.total,
                degreeOfSuccess: roll?.degreeOfSuccess ?? null,
              }
              : null,
          };
        }
      }
    }
  }

  if (event.shiftKey) {
    const controlled = canvas?.tokens?.controlled;
    if (controlled?.length > 0) {
      controlled.map(async (token) => await token.actor.createEmbeddedDocuments('Item', [itemSource]));
    } else ui.notifications.error(game.i18n.localize('ELA.ErrorMessage.NoTokenSelected'))
    window._token = controlled[0];
  } else if (event.altKey) {
    const targets = game?.user?.targets;
    if (targets?.size > 0) {
      targets.map(async (token) => await token.actor.createEmbeddedDocuments('Item', [itemSource]));
    } else ui.notifications.error(game.i18n.localize('ELA.ErrorMessage.NoTargetSelected'))
  }
};

Hooks.on('init', () => {
  console.info('Entity Link Affector enabled' + (CONFIG.PF2E ? ' (PF2E support)' : ''));
  if (typeof libWrapper === 'function') {
    libWrapper.register('entity-link-affector', 'TextEditor._onClickContentLink', async function (wrapped, ...args) { 
      return _onClickContentLink(wrapped, ...args);
    }, 'MIXED');
  }
});


