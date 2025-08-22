"""
Helper functions for LaTeX preprocessing in Manim code
"""

import re
import logging

def fix_cases_environment(latex_content: str) -> str:
    """
    Fix common issues in the LaTeX cases environment specifically
    """
    # First, identify all cases environments
    cases_pattern = r'\\begin{cases}(.*?)\\end{cases}'
    cases_matches = list(re.finditer(cases_pattern, latex_content, re.DOTALL))
    
    # If no cases environments, return original content
    if not cases_matches:
        return latex_content
    
    # Process each cases environment separately
    result = latex_content
    offset = 0  # Track position changes due to replacements
    
    for match in cases_matches:
        # Get the original cases content
        start, end = match.span()
        start += offset  # Adjust for previous replacements
        end += offset
        
        original_cases = match.group(0)
        cases_content = match.group(1)
        
        # Fix 1: Ensure proper line breaks with double backslashes between conditions
        fixed_content = re.sub(r'([^\\])\s*\n\s*', r'\1\\\\\n', cases_content)
        
        # Fix 2: Replace single backslashes used as line breaks with double backslashes
        # But make sure we're not doubling already correct \\
        fixed_content = re.sub(r'([^\\])\\(?!\\)([^\\])', r'\1\\\\\2', fixed_content)
        
        # Fix 3: Ensure & has proper spacing for alignment and is followed by \\
        fixed_content = re.sub(r'([^&])\s*&\s*([^\\]*?)(\s*$|\n)', r'\1 & \2\\\\\3', fixed_content)
        
        # Fix 4: Handle common text condition pattern with "if" statements
        fixed_content = re.sub(
            r'(\\text{[^}]*if[^}]*})\s*([^\\]+)(?!\\\\)', 
            r'\1 \2\\\\', 
            fixed_content
        )
        
        # Fix 5: Handle cases where a condition is followed by another condition without linebreak
        fixed_content = re.sub(
            r'([^\\])\s*&\s*([^\\]*?)\s*([a-zA-Z0-9]+ *(?:>|<|=|\\geq|\\leq|\\neq) *[^\\]*?)(?!\\\\)(\s*$|\n)',
            r'\1 & \2\3\\\\\4',
            fixed_content
        )
        
        # Fix 6: Make sure there's a \\ before \end{cases} unless already there
        if not fixed_content.rstrip().endswith('\\\\'):
            fixed_content = fixed_content.rstrip() + '\\\\'
        
        # Construct the fixed cases environment
        fixed_cases = f"\\begin{{cases}}{fixed_content}\\end{{cases}}"
        
        # Replace in the result
        result = result[:start] + fixed_cases + result[end:]
        
        # Update offset for future replacements
        offset += len(fixed_cases) - len(original_cases)
    
    return result

def fix_matrix_environment(latex_content: str) -> str:
    """
    Fix common issues in LaTeX matrix environments
    """
    # Look for different matrix environments
    matrix_pattern = r'\\begin{([^}]*matrix[^}]*)}(.*?)\\end{\1}'
    matrix_matches = list(re.finditer(matrix_pattern, latex_content, re.DOTALL))
    
    if not matrix_matches:
        return latex_content
    
    result = latex_content
    offset = 0
    
    for match in matrix_matches:
        start, end = match.span()
        start += offset
        end += offset
        
        matrix_type = match.group(1)  # pmatrix, bmatrix, etc.
        original_matrix = match.group(0)
        matrix_content = match.group(2)
        
        # Fix 1: Ensure rows end with double backslashes
        fixed_content = re.sub(r'([^\\])\s*\n\s*', r'\1\\\\\n', matrix_content)
        
        # Fix 2: Ensure & has proper spacing
        fixed_content = re.sub(r'([^&])\s*&\s*', r'\1 & ', fixed_content)
        
        # Construct fixed matrix
        fixed_matrix = f"\\begin{{{matrix_type}}}{fixed_content}\\end{{{matrix_type}}}"
        
        # Replace in result
        result = result[:start] + fixed_matrix + result[end:]
        
        # Update offset
        offset += len(fixed_matrix) - len(original_matrix)
    
    return result

def fix_alignment_environment(latex_content: str) -> str:
    """
    Fix common issues in alignment environments (align, aligned, etc.)
    """
    # Pattern for alignment environments
    align_pattern = r'\\begin{(align|aligned|alignat|gather|gathered)}(.*?)\\end{\1}'
    align_matches = list(re.finditer(align_pattern, latex_content, re.DOTALL))
    
    if not align_matches:
        return latex_content
    
    result = latex_content
    offset = 0
    
    for match in align_matches:
        start, end = match.span()
        start += offset
        end += offset
        
        env_type = match.group(1)
        original_env = match.group(0)
        content = match.group(2)
        
        # Fix 1: Ensure line breaks use double backslashes
        fixed_content = re.sub(r'([^\\])\s*\n\s*', r'\1\\\\\n', content)
        
        # Fix 2: Ensure & for alignment has proper spacing
        fixed_content = re.sub(r'([^&])\s*&\s*', r'\1 & ', fixed_content)
        
        # Construct fixed environment
        fixed_env = f"\\begin{{{env_type}}}{fixed_content}\\end{{{env_type}}}"
        
        # Replace in result
        result = result[:start] + fixed_env + result[end:]
        
        # Update offset
        offset += len(fixed_env) - len(original_env)
    
    return result

def fix_text_commands(latex_content: str) -> str:
    """
    Fix common issues with \text{} commands in LaTeX
    """
    # Add proper spacing inside \text{} commands
    return re.sub(
        r'\\text{([^}]+)}',
        lambda m: f"\\text{{ {m.group(1).strip()} }}",
        latex_content
    )

def escape_backslashes_in_strings(code: str) -> str:
    """
    Properly escape backslashes in Python strings containing LaTeX
    """
    # Find all string literals that contain LaTeX commands
    string_pattern = r'([\'"])((?:(?!\1).)*\\(?:(?!\1).)*)\1'
    
    result = code
    offset = 0
    
    for match in re.finditer(string_pattern, code):
        start, end = match.span()
        start += offset
        end += offset
        
        quote = match.group(1)  # ' or "
        content = match.group(2)
        
        # Only process if it contains LaTeX commands
        if '\\begin{' in content or '\\end{' in content or '\\frac' in content or '\\text{' in content:
            # Escape backslashes properly
            escaped_content = re.sub(r'(?<!\\)\\(?!\\)', r'\\\\', content)
            
            # Create the new string
            new_string = f"{quote}{escaped_content}{quote}"
            
            # Replace in the result
            result = result[:start] + new_string + result[end:]
            
            # Update offset
            offset += len(new_string) - (end - start)
    
    return result

def check_matching_delimiters(latex_content: str) -> str:
    """
    Check and fix various matching delimiter pairs in LaTeX content
    """
    # Check bracket pairs
    delimiters = [
        ('{', '}', 'braces'),
        ('(', ')', 'parentheses'),
        ('[', ']', 'brackets'),
        ('\\left(', '\\right)', 'math parentheses'),
        ('\\left[', '\\right]', 'math brackets'),
        ('\\left\\{', '\\right\\}', 'math braces'),
        ('\\left|', '\\right|', 'math vertical bars'),
        ('\\left\\langle', '\\right\\rangle', 'math angle brackets'),
    ]
    
    fixed_content = latex_content
    
    for open_del, close_del, name in delimiters:
        open_count = fixed_content.count(open_del)
        close_count = fixed_content.count(close_del)
        
        if open_count > close_count:
            # Add missing closing delimiters
            fixed_content = fixed_content + close_del * (open_count - close_count)
            print(f"   ⚠️ Added {open_count - close_count} missing {name}")
    
    # Special handling for \begin{env} and \end{env} pairs
    env_begin_pattern = r'\\begin{([^}]+)}'
    env_begins = re.findall(env_begin_pattern, fixed_content)
    
    for env in set(env_begins):
        begins = fixed_content.count(f'\\begin{{{env}}}')
        ends = fixed_content.count(f'\\end{{{env}}}')
        
        if begins > ends:
            # Add missing \end{env} tags
            fixed_content = fixed_content + f'\\end{{{env}}}' * (begins - ends)
            print(f"   ⚠️ Added {begins - ends} missing \\end{{{env}}}")
    
    return fixed_content

def fix_unmatched_braces(latex_content: str) -> str:
    """
    Fix unmatched braces in LaTeX content
    """
    # First apply the general delimiter checker
    latex_content = check_matching_delimiters(latex_content)
    
    # Additional specific check for braces which are especially important
    open_braces = latex_content.count('{')
    close_braces = latex_content.count('}')
    
    # Add missing closing braces if needed
    if open_braces > close_braces:
        latex_content = latex_content + "}" * (open_braces - close_braces)
        print(f"   ⚠️ Added {open_braces - close_braces} missing closing braces")
    elif close_braces > open_braces:
        # This is harder to fix - we don't know where to insert opening braces
        # Just add a warning for now
        print(f"   ⚠️ Warning: {close_braces - open_braces} extra closing braces detected")
    
    # Find unclosed inline math delimiters
    dollars = latex_content.count('$')
    if dollars % 2 != 0:
        latex_content = latex_content + "$"
        print("   ⚠️ Added missing $ delimiter")
    
    return latex_content

def fix_align_environment(latex_content: str) -> str:
    """
    Fix common issues with align environments
    """
    # Check if we have align environment without * but end with *
    if "\\begin{align}" in latex_content and "\\end{align*}" in latex_content:
        latex_content = latex_content.replace("\\begin{align}", "\\begin{align*}")
        print("   ⚠️ Fixed mismatched align/align* environment")
    
    # Check if we have align* environment without * at end
    if "\\begin{align*}" in latex_content and "\\end{align}" in latex_content:
        latex_content = latex_content.replace("\\end{align}", "\\end{align*}")
        print("   ⚠️ Fixed mismatched align*/align environment")
    
    return latex_content

def fix_dollar_delimiters(latex_content: str) -> str:
    """
    Fix issues with dollar sign math delimiters in LaTeX content
    """
    # Don't convert if there are no dollar signs
    if '$' not in latex_content:
        return latex_content
    
    print("   🔍 Detected dollar sign math delimiters, fixing them...")
    result = latex_content
    
    # First, handle the special case of double dollar signs for display math
    # Replace $$ math $$ with \begin{align} math \end{align}
    result = re.sub(r'\$\$(.*?)\$\$', r'\\begin{align}\1\\end{align}', result, flags=re.DOTALL)
    
    # Now handle single dollar signs for inline math
    # In Manim's MathTex, the content is already treated as math mode
    # So we can simply remove the dollar signs if they're not already part of a LaTeX command
    
    # Helper function to check if a dollar sign is part of a LaTeX command
    def is_command_dollar(match):
        full_text = match.string
        start_pos = match.start()
        
        # Check if this dollar is escaped or part of a command
        if start_pos > 0 and full_text[start_pos-1] == '\\':
            return True
        
        return False
    
    # Find all dollar signs
    dollar_positions = [match.start() for match in re.finditer(r'\$', result)]
    
    # If we have an odd number of dollar signs, add one at the end to balance
    if len(dollar_positions) % 2 != 0:
        result += '$'
        dollar_positions.append(len(result) - 1)
        print("   ⚠️ Added missing closing $ delimiter")
    
    # Process pairs of dollar signs (from end to beginning to avoid offset issues)
    for i in range(len(dollar_positions) - 1, 0, -2):
        end_pos = dollar_positions[i]
        start_pos = dollar_positions[i-1]
        
        # Skip if either dollar sign is part of a command
        if is_command_dollar(re.match(r'\$', result[start_pos:])) or \
           is_command_dollar(re.match(r'\$', result[end_pos:])):
            continue
        
        # Extract the math content
        math_content = result[start_pos+1:end_pos]
        
        # Remove the dollar signs
        result = result[:start_pos] + math_content + result[end_pos+1:]
        
        # Adjust remaining positions due to removal of two dollar signs
        for j in range(i-2, -1, -1):
            if dollar_positions[j] > start_pos:
                dollar_positions[j] -= 2
    
    return result

def preprocess_latex_content(latex_content: str) -> str:
    """
    Preprocesses LaTeX content to fix common issues that cause rendering problems
    """
    # Apply all fixes in sequence
    result = latex_content
    
    # Fix structural issues first
    result = fix_unmatched_braces(result)
    result = fix_align_environment(result)
    result = fix_dollar_delimiters(result)
    
    # Fix specific environments
    result = fix_cases_environment(result)
    result = fix_matrix_environment(result)
    result = fix_alignment_environment(result)
    
    # Fix general LaTeX commands
    result = fix_text_commands(result)
    
    # Fix common specific patterns that often cause problems
    result = result.replace(
        "\\begin{cases} x^2 & \\text{if } x \\geq 0 \\ -x^2",
        "\\begin{cases} x^2 & \\text{if } x \\geq 0 \\\\ -x^2"
    )
    result = result.replace(
        "\\begin{cases} x^2, & \\text{if } x \\geq 0 \\ -x^2",
        "\\begin{cases} x^2, & \\text{if } x \\geq 0 \\\\ -x^2"
    )
    result = result.replace(
        "\\text{if } x \\geq 0 \\ ",
        "\\text{if } x \\geq 0 \\\\ "
    )
    
    # Double check for proper line breaks in all environments
    environments = ['cases', 'matrix', 'pmatrix', 'bmatrix', 'align', 'aligned']
    for env in environments:
        pattern = f'\\\\begin{{{env}}}(.*?)\\\\end{{{env}}}'
        result = re.sub(
            pattern,
            lambda m: re.sub(r'([^\\])\s*\n\s*', r'\1\\\\\n', m.group(0)),
            result,
            flags=re.DOTALL
        )
    
    return result

def fix_common_latex_errors(code: str) -> str:
    """
    Fix common LaTeX errors in Manim Python code
    """
    try:
        # Fix LaTeX content in the code
        processed_code = preprocess_latex_content(code)
        
        # Fix string escaping for Python code
        if "MathTex" in code or "Tex(" in code or "r\"" in code:
            processed_code = escape_backslashes_in_strings(processed_code)
        
        return processed_code
    except Exception as e:
        print(f"Error fixing LaTeX: {e}")
        # Return the original code if we encounter an error
        return code
