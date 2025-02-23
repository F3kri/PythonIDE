// Configuration globale
export let currentLanguage = 'python';

// Couleurs de la syntaxe - utiliser let au lieu de const
export let syntaxColors = JSON.parse(localStorage.getItem('syntaxColors')) || {
    keywordColor: '#60a5fa',
    stringColor: '#34d399',
    functionColor: '#f59e0b',
    numberColor: '#f87171'
};

// Suggestions de code pour Python
export const pythonSuggestions = {
    'pr': 'print()',
    'inp': 'input()',
    'def': 'def function_name():',
    'for': 'for i in range():',
    'if': 'if condition:',
    'wh': 'while condition:',
    'try': 'try:\n    \nexcept Exception as e:',
    'imp': 'import ',
    'cls': 'class ClassName:',
    'ret': 'return ',
    'len': 'len()',
    'str': 'str()',
    'int': 'int()',
    'lis': 'list()',
    'ran': 'range()',
};

// Suggestions de code pour JavaScript
export const jsSuggestions = {
    'con': 'console.log()',
    'fun': 'function name() {\n    \n}',
    'for': 'for (let i = 0; i < n; i++) {\n    \n}',
    'if': 'if (condition) {\n    \n}',
    'wh': 'while (condition) {\n    \n}',
    'try': 'try {\n    \n} catch (error) {\n    \n}',
    'let': 'let  = ',
    'con': 'const  = ',
    'imp': 'import  from ""',
    'cls': 'class  {\n    constructor() {\n        \n    }\n}',
    'ret': 'return ',
};

// Mots-clés pour la coloration syntaxique
export const pythonKeywords = [
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
    'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'True', 'try', 'while', 'with', 'yield'
];

export const jsKeywords = [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
    'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return',
    'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
    'while', 'with', 'yield', 'let', 'static', 'enum', 'await', 'async'
]; 