import { Race } from "../types/race.js";


export const RACES: Race[] = [
    {
        id: 'human',
        name: 'Человек',
        stars: 1,
        description: 'Обычный человек, ничем не примечательный.',
        weight: 500,
        emoji: '<:726931good:1518587367110213642>',
        image: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemNyMzk5eXgzcGZ5cmQzcXByd3VjOHd4d2w3cHppczRyN3Q5NGF3bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xUA7b7GQh38iuPTKBq/giphy.gif'
    },
    {
        id: 'elf',
        name: 'Эльф',
        stars: 2,
        description: 'Типичные слуги магического мира, являющиеся воплощением магии, но может вы способны на что-то большее, чем просто стать домохозяйкой?',
        weight: 250,
        emoji: '<:726931good:1518587367110213642>',
        image: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExemh4aTl6NjYzYXkzZGpvbDBybWhzczh0ejY1Y3pzY281cjBqb25oMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/T1HNGhvx14iru/giphy.gif'
    },
    {
        id: 'giant',
        name: 'Великан',
        stars: 2,
        description: 'Огромное существо, обладающее невероятной физической силой.',
        weight: 150,
        emoji: '<:726931good:1518587367110213642>',
        image: 'https://cdn.discordapp.com/attachments/1452333633229553714/1518485661370286131/ad1a72915c9216f7ba2084aedcfed24a.png?ex=6a3a1779&is=6a38c5f9&hm=8ac320d92e0f00d7f8c6b9397bac3461255e7aff85869b05d4bb0d4c1b482eb5&'
    },
    {
        id: 'werewolf',
        name: 'Оборотень',
        stars: 3,
        description: 'Существо, способное превращаться в волка. Опасно и непредсказуемо.',
        weight: 80,
        emoji: '<:113449afk:1518587342171017286>',
        image: 'https://cdn.discordapp.com/attachments/1452333633229553714/1518485847693983864/57b0be1500f81c5d068621e45c17cf19.png?ex=6a3a17a6&is=6a38c626&hm=231a1bfd96007c819f46d0b582d0181c6d93b8b049132498272d4108544ae56b&'
    },
    {
        id: 'vampire',
        name: 'Вампир',
        stars: 5,
        description: 'Древнее существо ночи, обладающее бессмертием и жаждой крови.',
        weight: 20,
        emoji: '<:79278boostblack:1518587309417697300>',
        image: 'https://cdn.discordapp.com/attachments/1452333633229553714/1518486604132388924/29ac9f0893462a52df24ecdff377d1d4.png?ex=6a3a185a&is=6a38c6da&hm=ad6a50fcfb07675589edd2f9d5bfcd139549527d1841947221e90ea33764181c&'
    }
];